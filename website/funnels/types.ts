import type { PlanId } from "@/lib/plans";

// Funnel engine types (SPEC §8.2). A funnel is data: adding one = a new config file, no new components.

export type Option = { value: string; label: string; hint?: string };

export type Answers = {
  struggles?: string[];
  burden?: number;
  denomination?: string;
  prayerFrequency?: string;
  obstacles?: string[];
  aiComfort?: string;
  firstName?: string;
  prayerTime?: string;
};
export type AnswerKey = keyof Answers;

type Base = { id: string };
export type Step = Base &
  (
    | { type: "landing"; title: string; subtitle: string; cta: string; scene: string }
    | { type: "single"; title: string; subtitle?: string; options: Option[]; answerKey: AnswerKey; sensitive?: boolean }
    | { type: "multi"; title: string; subtitle?: string; options: Option[]; answerKey: AnswerKey; maxSelect?: number; sensitive?: boolean }
    | { type: "scale"; title: string; statement: string; low: string; high: string; answerKey: "burden"; sensitive?: boolean }
    | { type: "text"; title: string; subtitle?: string; placeholder: string; answerKey: "firstName" }
    | { type: "fact"; title: string; stat?: string; body: string; source: string; scene: string }
    | { type: "loading"; messages: string[]; micro?: { title: string; options: Option[]; answerKey: AnswerKey } }
    | { type: "plan" }
    | { type: "email" }
    | { type: "paywall" }
  );

export type FunnelConfig = {
  slug: string;
  hook: string; // one line, for the team: what this funnel promises
  hypothesis: string; // what we test with it
  scene: string;
  steps: Step[];
  plans: PlanId[];
};
