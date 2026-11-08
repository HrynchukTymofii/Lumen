import { struggle } from "@website/funnels/struggle";
import type { Step } from "@website/funnels/types";
import type { Answers } from "@/lib/api/types";

// The in-app quiz (SPEC §10.1) is the web funnel itself (website/funnels/struggle.ts): the same questions, insight
// screens and loading screen, in the same order, so a change there changes both. The app has its own screens for
// the rest: the welcome screen instead of the landing, sign-in instead of the email step, then the first prayer,
// the 7-day path and the paywall after sign-in.

const IN_QUIZ = new Set<Step["type"]>(["single", "multi", "scale", "text", "fact", "insight", "obstacle-insight", "loading"]);

export type QuizStep = Extract<Step, { type: "single" | "multi" | "scale" | "text" | "fact" | "insight" | "obstacle-insight" | "loading" }>;
export const QUIZ = struggle.steps.filter((s): s is QuizStep => IN_QUIZ.has(s.type));

export const quizIndex = (id: string) => Math.max(0, QUIZ.findIndex((s) => s.id === id));

// A small landscape for each answer (option value → scene). Answers without one take turns through ROTATION.
const SCENES: Record<string, string> = {
  // What are you carrying
  anxiety: "lake",
  grief: "dusk",
  family: "sky",
  work: "golden",
  health: "meadow",
  loneliness: "evening",
  doubt: "night",
  guilt: "dawn",
  gratitude: "meadow",
  // Tradition
  catholic: "golden",
  protestant: "sky",
  orthodox: "evening",
  exploring: "dawn",
  not_sure: "meadow",
  // AI
  comfortable: "sky",
  unsure: "meadow",
  background: "lake",
};
const ROTATION = ["dawn", "sky", "meadow", "lake", "golden", "dusk", "evening", "night"];
export const sceneFor = (value: string, i: number) => SCENES[value] ?? ROTATION[i % ROTATION.length];

/** The answer already given to a question, as a list */
export const quizValue = (answers: Answers, key: keyof Answers): string[] => {
  const v = answers[key];
  return Array.isArray(v) ? v : v !== undefined ? [String(v)] : [];
};
