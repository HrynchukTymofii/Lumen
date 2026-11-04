import { createLocalStore } from "./localStore";

// Bible reading plans: the Bible (or part of it) split into daily readings, read at the person's own pace.
// The day to read is the first one not done yet, so missing a day never puts anyone "behind": the plan just waits.
// Progress is kept on this phone for now (one plan at a time); reminders are scheduled on the phone too
// (lib/notifications.ts schedulePlanReminders). Opening a chapter of today's reading in the Bible ticks it
// (noteChapterRead, called by the reader); once every chapter is ticked, or "Mark as read" is tapped, the day is done.

// The 66 books with their chapter counts, in order (OSIS ids as the Bible API uses them)
const BOOKS: [osis: string, name: string, chapters: number][] = [
  ["Gen", "Genesis", 50], ["Exod", "Exodus", 40], ["Lev", "Leviticus", 27], ["Num", "Numbers", 36], ["Deut", "Deuteronomy", 34],
  ["Josh", "Joshua", 24], ["Judg", "Judges", 21], ["Ruth", "Ruth", 4], ["1Sam", "1 Samuel", 31], ["2Sam", "2 Samuel", 24],
  ["1Kgs", "1 Kings", 22], ["2Kgs", "2 Kings", 25], ["1Chr", "1 Chronicles", 29], ["2Chr", "2 Chronicles", 36], ["Ezra", "Ezra", 10],
  ["Neh", "Nehemiah", 13], ["Esth", "Esther", 10], ["Job", "Job", 42], ["Ps", "Psalms", 150], ["Prov", "Proverbs", 31],
  ["Eccl", "Ecclesiastes", 12], ["Song", "Song of Songs", 8], ["Isa", "Isaiah", 66], ["Jer", "Jeremiah", 52], ["Lam", "Lamentations", 5],
  ["Ezek", "Ezekiel", 48], ["Dan", "Daniel", 12], ["Hos", "Hosea", 14], ["Joel", "Joel", 3], ["Amos", "Amos", 9],
  ["Obad", "Obadiah", 1], ["Jonah", "Jonah", 4], ["Mic", "Micah", 7], ["Nah", "Nahum", 3], ["Hab", "Habakkuk", 3],
  ["Zeph", "Zephaniah", 3], ["Hag", "Haggai", 2], ["Zech", "Zechariah", 14], ["Mal", "Malachi", 4],
  ["Matt", "Matthew", 28], ["Mark", "Mark", 16], ["Luke", "Luke", 24], ["John", "John", 21], ["Acts", "Acts", 28],
  ["Rom", "Romans", 16], ["1Cor", "1 Corinthians", 16], ["2Cor", "2 Corinthians", 13], ["Gal", "Galatians", 6], ["Eph", "Ephesians", 6],
  ["Phil", "Philippians", 4], ["Col", "Colossians", 4], ["1Thess", "1 Thessalonians", 5], ["2Thess", "2 Thessalonians", 3],
  ["1Tim", "1 Timothy", 6], ["2Tim", "2 Timothy", 4], ["Titus", "Titus", 3], ["Phlm", "Philemon", 1], ["Heb", "Hebrews", 13],
  ["Jas", "James", 5], ["1Pet", "1 Peter", 5], ["2Pet", "2 Peter", 3], ["1John", "1 John", 5], ["2John", "2 John", 1],
  ["3John", "3 John", 1], ["Jude", "Jude", 1], ["Rev", "Revelation", 22],
];

export type Chapter = { osis: string; book: string; chapter: number };

function chaptersOf(from: string, to: string): Chapter[] {
  const start = BOOKS.findIndex((b) => b[0] === from);
  const end = BOOKS.findIndex((b) => b[0] === to);
  return BOOKS.slice(start, end + 1).flatMap(([osis, book, n]) => Array.from({ length: n }, (_, i) => ({ osis, book, chapter: i + 1 })));
}

export type Plan = {
  id: string;
  title: string;
  /** One line on the card */
  blurb: string;
  description: string;
  days: number;
  /** Minutes a chapter takes to read, for "about 15 min" */
  perChapter: number;
  scene: string;
  chapters: () => Chapter[];
};

export const PLANS: Plan[] = [
  {
    id: "bible-year",
    title: "The Bible in a year",
    blurb: "Genesis to Revelation, about 15 minutes a day",
    description: "Read the whole Bible, from the first page to the last, in 365 daily readings of three or four chapters.",
    days: 365,
    perChapter: 4,
    scene: "golden",
    chapters: () => chaptersOf("Gen", "Rev"),
  },
  {
    id: "nt-90",
    title: "New Testament in 90 days",
    blurb: "The life of Jesus and the early Church",
    description: "The Gospels, Acts, the letters and Revelation in 90 days, about three chapters a day.",
    days: 90,
    perChapter: 4,
    scene: "sky",
    chapters: () => chaptersOf("Matt", "Rev"),
  },
  {
    id: "gospels-40",
    title: "The Gospels in 40 days",
    blurb: "Matthew, Mark, Luke and John",
    description: "Walk with Jesus through all four Gospels in 40 days, two or three chapters a day.",
    days: 40,
    perChapter: 4,
    scene: "meadow",
    chapters: () => chaptersOf("Matt", "John"),
  },
  {
    id: "psalms-30",
    title: "Psalms in 30 days",
    blurb: "Five psalms a day for prayer and comfort",
    description: "All 150 psalms in a month: songs of praise, lament and trust to pray along with.",
    days: 30,
    perChapter: 2,
    scene: "evening",
    chapters: () => chaptersOf("Ps", "Ps"),
  },
  {
    id: "proverbs-31",
    title: "Proverbs in a month",
    blurb: "One chapter of wisdom a day",
    description: "A chapter of Proverbs for every day of the month: short, practical wisdom for everyday life.",
    days: 31,
    perChapter: 3,
    scene: "dawn",
    chapters: () => chaptersOf("Prov", "Prov"),
  },
];

export const planById = (id: string) => PLANS.find((p) => p.id === id);

/** The chapters of one day (0-based), the plan's chapters shared evenly across its days */
export function dayChapters(plan: Plan, day: number): Chapter[] {
  const all = plan.chapters();
  return all.slice(Math.floor((day * all.length) / plan.days), Math.floor(((day + 1) * all.length) / plan.days));
}

/** "Genesis 34–36", "Genesis 50 · Exodus 1–2" */
export function readingLabel(chapters: Chapter[]) {
  const parts: { book: string; from: number; to: number }[] = [];
  for (const c of chapters) {
    const last = parts[parts.length - 1];
    if (last && last.book === c.book && last.to === c.chapter - 1) last.to = c.chapter;
    else parts.push({ book: c.book, from: c.chapter, to: c.chapter });
  }
  return parts.map((p) => (p.from === p.to ? `${p.book} ${p.from}` : `${p.book} ${p.from}–${p.to}`)).join(" · ");
}

export const readingMinutes = (plan: Plan, chapters: Chapter[]) => Math.max(1, Math.round(chapters.length * plan.perChapter));

const key = (c: Pick<Chapter, "osis" | "chapter">) => `${c.osis}.${c.chapter}`;

// ───────── Progress (one plan at a time) ─────────

export type PlanProgress = {
  planId: string;
  startedAt: string; // YYYY-MM-DD
  done: number[]; // days finished (0-based)
  read: string[]; // chapters opened of the day being read ("Gen.34")
  reminder: string | null; // "HH:MM"
  lastDoneOn: string | null; // YYYY-MM-DD the last day was finished, so the reminder skips that day
};

const store = createLocalStore<PlanProgress | null>("reading-plan", null);
export const usePlanProgress = store.use;
export const planProgress = store.get;
export const planReady = store.ready;

export const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

/** The day to read next (0-based), or null once the plan is finished */
export function nextDay(plan: Plan, progress: PlanProgress) {
  for (let d = 0; d < plan.days; d++) if (!progress.done.includes(d)) return d;
  return null;
}

export function startPlan(planId: string, reminder: string | null) {
  store.set({ planId, startedAt: today(), done: [], read: [], reminder, lastDoneOn: null });
}

export function stopPlan() {
  store.set(null);
}

export function setPlanReminder(reminder: string | null) {
  store.set((p) => (p ? { ...p, reminder } : p));
}

/** Finishes the day being read. Returns true when it was finished now (not already). */
export function finishDay(day: number) {
  const p = store.get();
  if (!p || p.done.includes(day)) return false;
  store.set({ ...p, done: [...p.done, day].sort((a, b) => a - b), read: [], lastDoneOn: today() });
  return true;
}

/**
 * The reader opened a chapter: if it belongs to the day being read, tick it, and finish the day once all its
 * chapters are ticked. Returns the finished day's number, or null.
 */
export function noteChapterRead(osis: string, chapter: number): number | null {
  const p = store.get();
  const plan = p && planById(p.planId);
  if (!p || !plan) return null;
  const day = nextDay(plan, p);
  if (day === null) return null;
  const chapters = dayChapters(plan, day);
  const k = key({ osis, chapter });
  if (!chapters.some((c) => key(c) === k) || p.read.includes(k)) return null;
  const read = [...p.read, k];
  if (chapters.every((c) => read.includes(key(c)))) return finishDay(day) ? day : null;
  store.set({ ...p, read });
  return null;
}

export const isChapterRead = (p: PlanProgress, c: Chapter) => p.read.includes(key(c));
