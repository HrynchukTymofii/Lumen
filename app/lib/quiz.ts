import { AI_COMFORT, DENOMINATIONS, PRAYER_TIME, STRUGGLES, type Option } from "@website/funnels/options";
import type { Answers } from "@/lib/api/types";

// The in-app quiz (SPEC §10.1): four of the web funnel's questions, with the funnel's own answer options
// (website/funnels/options.ts), so app and web answers land in the same profile fields.

export type QuizStep = {
  id: string;
  title: string;
  subtitle: string;
  answerKey: "struggles" | "denomination" | "prayerTime" | "aiComfort";
  options: Option[];
  multi?: number; // max picks
  sensitive?: boolean; // stored only with consent; never sent to analytics
  scenes: Record<string, string>; // option value → thumbnail landscape
};

export const QUIZ: QuizStep[] = [
  {
    id: "carrying",
    title: "What are you carrying right now?",
    subtitle: "Choose up to 3. Your first prayer will be about this.",
    answerKey: "struggles",
    options: STRUGGLES,
    multi: 3,
    sensitive: true,
    scenes: {
      anxiety: "lake",
      grief: "dusk",
      family: "sky",
      work: "golden",
      health: "meadow",
      loneliness: "evening",
      doubt: "night",
      guilt: "dawn",
      gratitude: "meadow",
    },
  },
  {
    id: "tradition",
    title: "Which tradition feels like home?",
    subtitle: "Your prayers will speak in a way that respects it. Kept private.",
    answerKey: "denomination",
    options: DENOMINATIONS,
    sensitive: true,
    scenes: { catholic: "golden", protestant: "sky", orthodox: "evening", exploring: "dawn", not_sure: "meadow" },
  },
  {
    id: "time",
    title: "When would you like to pray?",
    subtitle: "Your daily prayer will be ready by then.",
    answerKey: "prayerTime",
    options: PRAYER_TIME,
    scenes: { morning: "dawn", evening: "evening" },
  },
  {
    id: "ai",
    title: "How do you feel about AI helping you pray?",
    subtitle: "Every verse it shows is loaded from the Bible text, never invented.",
    answerKey: "aiComfort",
    options: AI_COMFORT,
    scenes: { comfortable: "sky", unsure: "meadow", background: "lake" },
  },
];

export const quizValue = (answers: Answers, step: QuizStep): string[] => {
  const v = answers[step.answerKey];
  return Array.isArray(v) ? v : v ? [v] : [];
};
