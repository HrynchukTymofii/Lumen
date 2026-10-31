import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

// Daily reminder (SPEC §10.3), scheduled on the phone rather than pushed from a server cron: it works offline and
// needs no per-minute server job. The next 7 days are scheduled at the chosen time; today is skipped once the
// person has prayed. The app re-schedules whenever Today loads, so the week keeps rolling forward.

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
  return p.granted || p.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
}

// The copy rotates by day (SPEC §10.3)
function message(day: number, name: string | null) {
  const lines = [
    { title: "Your prayer for today is ready", body: "Take a quiet minute with God." },
    { title: "A verse for today", body: "Open Lumen for today’s verse and prayer." },
    { title: name ? `${name}, take a quiet minute with God` : "Take a quiet minute with God", body: "Your daily prayer is waiting." },
  ];
  return lines[day % lines.length];
}

export async function cancelReminders() {
  if (Platform.OS === "web") return;
  await Notifications.cancelAllScheduledNotificationsAsync();
}

/**
 * Replaces the scheduled reminders. `time` is "HH:MM" local; null or `enabled: false` cancels them. Never asks for
 * permission: without it nothing is scheduled.
 */
export async function scheduleReminders(opts: { time: string | null; enabled: boolean; prayedToday: boolean; name: string | null }) {
  if (Platform.OS === "web") return;
  await cancelReminders();
  if (!opts.enabled || !opts.time || !(await hasPermission())) return;
  await ensureChannel();

  const [hours, minutes] = opts.time.split(":").map(Number);
  const now = new Date();
  for (let i = 0; i < DAYS_AHEAD; i++) {
    const at = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i, hours, minutes);
    if (at <= now || (i === 0 && opts.prayedToday)) continue;
    await Notifications.scheduleNotificationAsync({
      content: message(at.getDate(), opts.name),
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: at, channelId: CHANNEL },
    });
  }
}
