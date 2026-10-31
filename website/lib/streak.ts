import { HttpError } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

// Soft streak (SPEC §6.5): the week is Mon–Sun in the user's timezone and counts days prayed against their weekly
// goal. Missed days never reset anything; one grace day a week can fill yesterday if it was missed.

type StreakUser = { id: string; timezone: string; weeklyGoal: number; streakHidden: boolean };

/** Prisma `select` for the fields the streak needs. */
export const STREAK_USER = { id: true, timezone: true, weeklyGoal: true, streakHidden: true } as const;

/** The signed-in user's streak fields. */
export async function streakUser(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: STREAK_USER });
  if (!user) throw new HttpError(401, "Account not found");
  return user;
}

const DAY_MS = 86_400_000;

/** "YYYY-MM-DD" in the given timezone. */
export function localDate(timezone: string, at = new Date()) {
  // en-CA formats as YYYY-MM-DD
  return new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).format(at);
}

// Date strings are handled as UTC midnights, so adding days never trips over daylight saving
const toMs = (date: string) => Date.parse(`${date}T00:00:00Z`);
const fromMs = (ms: number) => new Date(ms).toISOString().slice(0, 10);
export const addDays = (date: string, days: number) => fromMs(toMs(date) + days * DAY_MS);

/** The Monday of the week that contains `date`. */
export function weekStart(date: string) {
  const weekday = (new Date(toMs(date)).getUTCDay() + 6) % 7; // Monday = 0
  return addDays(date, -weekday);
}

export async function getStreak(user: StreakUser) {
  const today = localDate(user.timezone);
  const start = weekStart(today);
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  const yesterday = addDays(today, -1);
  const from = yesterday < start ? yesterday : start;

  const rows = await prisma.prayerCompletion.findMany({
    where: { userId: user.id, date: { gte: from, lte: days[6] } },
    select: { date: true, isGrace: true },
  });
  const done = new Set(rows.map((r) => r.date));
  // Grace belongs to the week of the day it fills, so on a Monday it can still save Sunday
  const graceWeek = weekStart(yesterday);
  const graceUsed = rows.some((r) => r.isGrace && weekStart(r.date) === graceWeek);

  return {
    goal: user.weeklyGoal,
    weekDays: days,
    doneThisWeek: days.map((d) => done.has(d)),
    graceDays: days.map((d) => rows.some((r) => r.date === d && r.isGrace)),
    graceAvailable: !graceUsed && !done.has(yesterday),
    hidden: user.streakHidden,
    today,
    prayedToday: done.has(today),
  };
}

/** Counts today as prayed. Idempotent: a second call the same day changes nothing. */
export async function markPrayed(user: StreakUser, prayerId?: string) {
  const date = localDate(user.timezone);
  await prisma.prayerCompletion.upsert({
    where: { userId_date: { userId: user.id, date } },
    create: { userId: user.id, date, prayerId },
    update: {},
  });
  return getStreak(user);
}

/** Fills yesterday with this week's grace day. */
export async function applyGrace(user: StreakUser) {
  const streak = await getStreak(user);
  if (!streak.graceAvailable) throw new HttpError(400, "There's no grace day to use right now");
  const yesterday = addDays(streak.today, -1);
  await prisma.prayerCompletion.create({ data: { userId: user.id, date: yesterday, isGrace: true } });
  return getStreak(user);
}

/** Journey: the last 8 weeks (oldest first) and totals (SPEC §6.7). */
export async function getJourney(user: StreakUser) {
  const thisWeek = weekStart(localDate(user.timezone));
  const starts = Array.from({ length: 8 }, (_, i) => addDays(thisWeek, (i - 7) * 7));
  const [recent, daysPrayed, prayers] = await Promise.all([
    prisma.prayerCompletion.findMany({ where: { userId: user.id, date: { gte: starts[0] } }, select: { date: true } }),
    prisma.prayerCompletion.count({ where: { userId: user.id, isGrace: false } }),
    prisma.prayerCompletion.count({ where: { userId: user.id, prayerId: { not: null } } }),
  ]);
  return {
    weeks: starts.map((start) => ({
      start,
      done: recent.filter((r) => weekStart(r.date) === start).length,
      goal: user.weeklyGoal,
    })),
    totals: { daysPrayed, prayers },
  };
}
