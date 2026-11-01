// Response shapes of the website API (website/lib/auth/users.ts publicUser, app/api/me/route.ts).

export type Denomination = "catholic" | "protestant" | "orthodox" | "not_sure" | "exploring";
export type Translation = "WEB" | "KJV" | "DRA";

export interface User {
  id: string;
  email: string;
  firstName: string | null;
  denomination: Denomination | null;
  translation: Translation;
  aiEnabled: boolean;
  weeklyGoal: number;
  streakHidden: boolean;
  reminderTime: string | null; // "07:30"
  remindersEnabled: boolean;
}

export type Premium =
  | { active: false }
  | {
      active: true;
      source: "stripe" | "app_store" | "play";
      productId: string;
      status: string;
      currentPeriodEnd: string | null;
    };

export interface LoginResponse {
  token: string;
  user: User;
  isNew: boolean;
}

export interface MeResponse {
  user: User;
  premium: Premium;
}

export type ProfilePatch = Partial<
  Pick<User, "firstName" | "denomination" | "translation" | "aiEnabled" | "weeklyGoal" | "streakHidden" | "reminderTime" | "remindersEnabled">
> & {
  timezone?: string;
};

// Quiz answers, same shape as the web funnel (website/funnels/types.ts Answers)
export interface Answers {
  struggles?: string[];
  burden?: number;
  denomination?: string;
  prayerFrequency?: string;
  obstacles?: string[];
  aiComfort?: string;
  firstName?: string;
  prayerTime?: string;
}

export interface Citation {
  ref: string;
  text: string;
}

export interface SamplePrayer {
  title: string;
  text: string;
  citations: Citation[];
  source: "ai" | "template";
}

// GET /api/today (website/app/api/today/route.ts)
export interface Today {
  date: string;
  prayer: { title: string; text: string; citations: Citation[] };
  verse: Citation & { translation: Translation };
  streak: Streak;
}

// Soft streak (website/lib/streak.ts): Mon–Sun in the user's timezone
export interface Streak {
  goal: number;
  weekDays: string[]; // 7 × "YYYY-MM-DD", Monday first
  doneThisWeek: boolean[];
  graceDays: boolean[];
  graceAvailable: boolean;
  hidden: boolean;
  today: string;
  prayedToday: boolean;
}

// GET /api/journey
export interface Journey {
  weeks: { start: string; done: number; goal: number }[]; // last 8, oldest first
  totals: { daysPrayed: number; prayers: number };
  // Days prayed this month and the five before it, oldest first (missing from servers before the calendar)
  days?: { date: string; grace: boolean }[];
  today?: string;
}

// Bible (website/app/api/bible/*)
export interface BibleBook {
  id: number;
  osis: string;
  name: string;
  testament: "OT" | "NT" | "DC";
  chapters: number;
}

export interface BibleChapter {
  book: Omit<BibleBook, "chapters">;
  chapter: number;
  translation: Translation;
  verses: { v: number; text: string }[];
  prev: { osis: string; chapter: number } | null;
  next: { osis: string; chapter: number } | null;
}

// GET /api/library (website/lib/content.ts toPublicTrack). Locked tracks carry the first 2 lines and no audio.
export interface TrackVariant {
  minutes: 1 | 3 | 5;
  durationSec: number | null;
  url: string | null;
  lines: { t: number | null; text: string }[];
}

export interface Track {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  category: string;
  tags: string[];
  scene: string;
  imageUrl: string | null; // cover picture; null → draw the scene
  scriptureRefs: string[];
  isPremium: boolean;
  locked: boolean;
  variants: TrackVariant[];
}

export interface PrayerPath {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  scene: string;
  isPremium: boolean;
  locked: boolean;
  days: { day: number; trackId: string }[];
}

export interface Library {
  version: number;
  tracks: Track[];
  paths: PrayerPath[];
}

// Companion (website/app/api/chat/*)
export interface Quota {
  used: number;
  limit: number;
  date: string;
  premium: boolean;
}

export interface ConversationSummary {
  id: string;
  title: string | null;
  updatedAt: string;
}

export interface Passage {
  ref: string;
  text: string;
  translation: Translation;
}

export type MessageCategory = "on_topic" | "off_topic" | "jailbreak" | "abuse" | "crisis";

export interface CrisisResource {
  label: string;
  href: string;
  note: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  category: MessageCategory | null;
  createdAt: string;
  citations: Passage[];
  // Only on a crisis reply received in this session
  resources?: CrisisResource[];
}
