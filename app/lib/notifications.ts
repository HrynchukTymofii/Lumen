import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { track } from "./analytics";
import { createLocalStore } from "./localStore";

// Daily reminders (SPEC §10.3), scheduled on the phone rather than pushed from a server cron: they work offline and
// need no per-minute server job. Two kinds, each with its own ids so re-scheduling one keeps the other:
//   prayer-*  morning and evening prayer (times from the quiz or Settings). The morning one is skipped once the
//             person has prayed today; the evening one always comes, since it invites an evening prayer.
//   plan-*    today's Bible reading (lib/readingPlans.ts), skipped once today's reading is done
// "Pause" (in church, a meeting) is kept on this phone: nothing is scheduled before it ends.
// The next 7 days are scheduled; the app re-schedules whenever Home loads, so the week keeps rolling forward.
// A reminder's `data.url` is where tapping it goes (app/_layout.tsx).

const CHANNEL = "reminders";
const DAYS_AHEAD = 7;

if (Platform.OS !== "web") {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }),
  });
}

// Android 13+ only shows the permission prompt once a channel exists
async function ensureChannel() {
  if (Platform.OS !== "android") return;
  await Notifications.setNotificationChannelAsync(CHANNEL, { name: "Daily reminder", importance: Notifications.AndroidImportance.DEFAULT });
}

export async function hasPermission() {
  if (Platform.OS === "web") return false;
  const p = await Notifications.getPermissionsAsync();
  return p.granted || p.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
}

/** Asks for permission if it wasn't decided yet. Returns whether reminders can be shown. */
export async function requestPermission() {
  if (Platform.OS === "web") return false;
  await ensureChannel();
  if (await hasPermission()) return true;
  const p = await Notifications.requestPermissionsAsync();
  const granted = p.granted || p.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
  track("push_permission_result", { granted }); // only when the system was actually asked
  return granted;
}

// The copy rotates by day (SPEC §10.3)
function message(slot: "morning" | "evening", day: number, name: string | null) {
  const lines =
    slot === "morning"
      ? [
          { title: "Your prayer for today is ready", body: "Take a quiet minute with God." },
          { title: "A verse for today", body: "Open Holy Hush for today’s verse and prayer." },
          { title: name ? `${name}, take a quiet minute with God` : "Take a quiet minute with God", body: "Your daily prayer is waiting." },
        ]
      : [
          { title: "Close the day with God", body: "A few quiet minutes before you rest." },
          { title: name ? `${name}, how was today?` : "How was today?", body: "Bring it to God in an evening prayer." },
          { title: "An evening prayer is waiting", body: "Let go of the day and rest in Him." },
        ];
  return lines[day % lines.length];
}

// ───────── Pause ─────────

const pause = createLocalStore<number | null>("reminders-paused-until", null);

/** When the pause ends (ms), or null when reminders aren't paused */
export function usePausedUntil() {
  const until = pause.use();
  return until && until > Date.now() ? until : null;
}

// The options each kind was last scheduled with, so pausing and resuming can re-schedule both
let lastPrayer: PrayerReminders | null = null;
let lastPlan: PlanReminders | null = null;

async function pausedUntil() {
  await pause.ready();
  const until = pause.get();
  return until && until > Date.now() ? until : 0;
}

async function reschedule() {
  await Promise.all([lastPrayer && scheduleReminders(lastPrayer), lastPlan && schedulePlanReminders(lastPlan)]);
}

/** Silences this app's reminders until `until` (ms); the ones after it stay scheduled */
export async function pauseReminders(until: number) {
  pause.set(until);
  track("reminders_paused", { hours: Math.round((until - Date.now()) / 3_600_000) });
  await reschedule();
}

export async function resumeReminders() {
  pause.set(null);
  await reschedule();
}

const PLAN_PREFIX = "plan-";

// Cancels one kind of reminder. Prayer reminders scheduled before the ids existed have random ids, so "prayer" also
// cancels anything that isn't a plan reminder.
async function cancelKind(kind: "prayer" | "plan") {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .filter((n) => (kind === "plan" ? n.identifier.startsWith(PLAN_PREFIX) : !n.identifier.startsWith(PLAN_PREFIX)))
      .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)),
  );
}

/** Cancels every reminder (signing out, deleting the account) */
export async function cancelReminders() {
  if (Platform.OS === "web") return;
  await Notifications.cancelAllScheduledNotificationsAsync();
}

/**
 * Replaces the reading-plan reminders. `time` is "HH:MM" local; null cancels them. Today is skipped once its reading
 * is done. Never asks for permission.
 */
type PlanReminders = { time: string | null; doneToday: boolean; title: string; body: string; from?: string };

export async function schedulePlanReminders(opts: PlanReminders) {
  if (Platform.OS === "web") return;
  lastPlan = opts;
  await cancelKind("plan");
  if (!opts.time || !(await hasPermission())) return;
  await ensureChannel();
  const [hours, minutes] = opts.time.split(":").map(Number);
  const now = new Date();
  const quietUntil = await pausedUntil();
  // A challenge that hasn't started yet: no reminders before its first day ("YYYY-MM-DD")
  const startsAt = opts.from ? new Date(`${opts.from}T00:00:00`).getTime() : 0;
  for (let i = 0; i < DAYS_AHEAD; i++) {
    const at = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i, hours, minutes);
    if (at <= now || (i === 0 && opts.doneToday) || at.getTime() < quietUntil || at.getTime() < startsAt) continue;
    await Notifications.scheduleNotificationAsync({
      identifier: `${PLAN_PREFIX}${i}`,
      content: { title: opts.title, body: opts.body, data: { url: "/plans" } },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: at, channelId: CHANNEL },
    });
  }
}

type PrayerReminders = { morning: string | null; evening: string | null; enabled: boolean; prayedToday: boolean; name: string | null };

/**
 * Replaces the prayer reminders. Times are "HH:MM" local; a null time (or `enabled: false`) turns that one off.
 * Never asks for permission: without it nothing is scheduled.
 */
export async function scheduleReminders(opts: PrayerReminders) {
  if (Platform.OS === "web") return;
  lastPrayer = opts;
  await cancelKind("prayer");
  if (!opts.enabled || (!opts.morning && !opts.evening) || !(await hasPermission())) return;
  await ensureChannel();

  const now = new Date();
  const quietUntil = await pausedUntil();
  for (const slot of ["morning", "evening"] as const) {
    const time = opts[slot];
    if (!time) continue;
    const [hours, minutes] = time.split(":").map(Number);
    for (let i = 0; i < DAYS_AHEAD; i++) {
      const at = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i, hours, minutes);
      if (at <= now || at.getTime() < quietUntil || (slot === "morning" && i === 0 && opts.prayedToday)) continue;
      await Notifications.scheduleNotificationAsync({
        identifier: `prayer-${slot}-${i}`,
        content: { ...message(slot, at.getDate(), opts.name), data: { url: "/today" } },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: at, channelId: CHANNEL },
      });
    }
  }
}
