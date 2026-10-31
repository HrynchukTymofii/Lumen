import { z } from "zod";
import { AI_COMFORT, DENOMINATIONS, FREQUENCY, OBSTACLES, PRAYER_TIME, STRUGGLES } from "./options";
import type { Option } from "./types";

// Server-side check of quiz answers: only values the funnel actually offers are accepted.
const oneOf = (options: Option[]) => z.enum(options.map((o) => o.value) as [string, ...string[]]);

export const answersSchema = z.object({
  struggles: z.array(oneOf(STRUGGLES)).max(5).optional(),
  burden: z.number().int().min(1).max(5).optional(),
  denomination: oneOf(DENOMINATIONS).optional(),
  prayerFrequency: oneOf(FREQUENCY).optional(),
  obstacles: z.array(oneOf(OBSTACLES)).max(5).optional(),
  aiComfort: oneOf(AI_COMFORT).optional(),
  firstName: z.string().trim().max(40).optional(),
  prayerTime: oneOf(PRAYER_TIME).optional(),
});
export type ValidAnswers = z.infer<typeof answersSchema>;
