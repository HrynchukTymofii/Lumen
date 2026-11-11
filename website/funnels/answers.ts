import { z } from "zod";
import {
  AI_COMFORT,
  ALL_STRUGGLES,
  CARRY_ALONE,
  CARRYING_SINCE,
  DENOMINATIONS,
  FEW_MINUTES,
  FREQUENCY,
  FUNNEL_AI_COMFORT,
  FUNNEL_DENOMINATIONS,
  OBSTACLE_NONE,
  OBSTACLES,
  PRAYER_TIME,
  PRAYING_FOR,
  TRANSLATIONS,
} from "./options";
import type { Option } from "./types";

// Server-side check of quiz answers: only values the funnel actually offers are accepted.
const oneOf = (options: Option[]) => z.enum([...new Set(options.map((o) => o.value))] as [string, ...string[]]);

export const answersSchema = z.object({
  struggles: z.array(oneOf(ALL_STRUGGLES)).max(5).optional(),
  carryingSince: oneOf(CARRYING_SINCE).optional(),
  burden: z.number().int().min(1).max(5).optional(),
  denomination: oneOf([...DENOMINATIONS, ...FUNNEL_DENOMINATIONS]).optional(),
  prayerFrequency: oneOf(FREQUENCY).optional(),
  obstacles: z.array(oneOf([...OBSTACLES, OBSTACLE_NONE])).max(5).optional(),
  aiComfort: oneOf([...AI_COMFORT, ...FUNNEL_AI_COMFORT]).optional(),
  firstName: z.string().trim().max(40).optional(),
  prayerTime: oneOf(PRAYER_TIME).optional(),
  prayingFor: oneOf(PRAYING_FOR).optional(),
  carryAlone: oneOf(CARRY_ALONE).optional(),
  translation: oneOf(TRANSLATIONS).optional(),
  fewMinutes: oneOf(FEW_MINUTES).optional(),
  share: z.string().trim().max(400).optional(),
});
export type ValidAnswers = z.infer<typeof answersSchema>;


export { aiComfortOf, denominationOf, shareNote, translationOf } from "./stored";
