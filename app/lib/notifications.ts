import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { track } from "./analytics";

// Daily reminders (SPEC §10.3), scheduled on the phone rather than pushed from a server cron: they work offline and
// need no per-minute server job. Two kinds, each with its own ids so re-scheduling one keeps the other:
//   prayer-*  the daily prayer, skipped once the person has prayed today
//   plan-*    today's Bible reading (lib/readingPlans.ts), skipped once today's reading is done
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
function message(day: number, name: string | null) {
  const lines = [
    { title: "Your prayer for today is ready", body: "Take a quiet minute with God." },
    { title: "A verse for today", body: "Open Holy Hush for today’s verse and prayer." },
    { title: name ? `${name}, take a quiet minute with God` : "Take a quiet minute with God", body: "Your daily prayer is waiting." },
  ];
  return lines[day % lines.length];
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
export async function schedulePlanReminders(opts: { time: string | null; doneToday: boolean; title: string; body: string }) {
  if (Platform.OS === "web") return;
  await cancelKind("plan");
  if (!opts.time || !(await hasPermission())) return;
  await ensureChannel();
  const [hours, minutes] = opts.time.split(":").map(Number);
  const now = new Date();
  for (let i = 0; i < DAYS_AHEAD; i++) {
    const at = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i, hours, minutes);
    if (at <= now || (i === 0 && opts.doneToday)) continue;
    await Notifications.scheduleNotificationAsync({
      identifier: `${PLAN_PREFIX}${i}`,
      content: { title: opts.title, body: opts.body, data: { url: "/plans" } },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: at, channelId: CHANNEL },
    });
  }
}

/**
 * Replaces the scheduled reminders. `time` is "HH:MM" local; null or `enabled: false` cancels them. Never asks for
 * permission: without it nothing is scheduled.
 */
export async function scheduleReminders(opts: { time: string | null; enabled: boolean; prayedToday: boolean; name: string | null }) {
  if (Platform.OS === "web") return;
  await cancelKind("prayer");
  if (!opts.enabled || !opts.time || !(await hasPermission())) return;
  await ensureChannel();

  const [hours, minutes] = opts.time.split(":").map(Number);
  const now = new Date();
  for (let i = 0; i < DAYS_AHEAD; i++) {
    const at = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i, hours, minutes);
    if (at <= now || (i === 0 && opts.prayedToday)) continue;
    await Notifications.scheduleNotificationAsync({
      identifier: `prayer-${i}`,
      content: { ...message(at.getDate(), opts.name), data: { url: "/today" } },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: at, channelId: CHANNEL },
    });
  }
}
