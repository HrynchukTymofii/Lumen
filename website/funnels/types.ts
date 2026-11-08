import type { Option } from "./options";
import type { Citation } from "./verses";

// Funnel engine types (SPEC §8.2). A funnel is data: adding one = a new config file, no new components.
// The phone app reads these files too (app/metro.config.js), so nothing here imports from outside funnels/.

export type { Option };

export type Answers = {
  struggles?: string[];
  carryingSince?: string;
  burden?: number;
  denomination?: string;
  prayerFrequency?: string;
  obstacles?: string[];
  aiComfort?: string;
  firstName?: string;
  prayerTime?: string;
};
export type AnswerKey = keyof Answers;

// A question worded after an earlier answer, e.g. "What gets in the way?" after "How often do you pray?".
// Keys are values of `answerKey`; a missing key keeps the step's own wording. `extra` options are added at the end.
export type Follow = {
  answerKey: AnswerKey;
  variants: Record<string, { title: string; subtitle?: string; extra?: Option[] }>;
};

type Base = { id: string };
export type Step = Base &
  (
    | { type: "landing"; title: string; subtitle: string; cta: string; scene: string }
    | { type: "single"; title: string; subtitle?: string; options: Option[]; answerKey: AnswerKey; sensitive?: boolean }
    | { type: "multi"; title: string; subtitle?: string; options: Option[]; answerKey: AnswerKey; maxSelect?: number; sensitive?: boolean; follows?: Follow }
    | { type: "scale"; title: string; statement: string; low: string; high: string; answerKey: "burden"; sensitive?: boolean }
    | { type: "text"; title: string; subtitle?: string; placeholder: string; answerKey: "firstName" }
    | { type: "fact"; title: string; stat?: string; body: string; source: string; scene: string }
    // A calm screen between questions. `named`: prefixed with the first name when there is one.
    | { type: "insight"; title: string; body: string; verse?: Citation; scene: string; named?: boolean }
    // Answers the visitor's own "what gets in the way": one [title, body] per obstacle value
    | { type: "obstacle-insight"; insights: Record<string, [string, string]>; prefer: string; scene: string }
    | { type: "loading"; messages: string[]; micro?: { title: string; options: Option[]; answerKey: AnswerKey } }
    | { type: "prayer" }
    | { type: "path" }
    | { type: "email" }
    | { type: "paywall" }
  );

export type FunnelConfig = {
  slug: string;
  hook: string; // one line, for the team: what this funnel promises
  hypothesis: string; // what we test with it
  scene: string;
  steps: Step[];
  plans: ("yearly" | "monthly")[]; // ids in lib/plans.ts
};
