import Anthropic from "@anthropic-ai/sdk";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { HttpError } from "@/lib/admin-auth";
import { handle, readJson } from "@/lib/api";
import { answersSchema } from "@/funnels/answers";
import { DENOMINATIONS, STRUGGLES, labelOf } from "@/funnels/options";
import { fallbackPrayer } from "@/funnels/plan";
import { versesFor } from "@/funnels/verses";

// Live sample prayer on the plan step (SPEC §6.1). Claude may only cite verses from the list we give it;
// anything else is dropped. No key, a slow answer or an error → the template prayer, so the funnel never stalls.
const MODEL = process.env.AI_MODEL_FAST ?? "claude-haiku-5-5";
const TIMEOUT_MS = 8000;

// Per server instance; good enough to stop casual abuse until the Postgres rate limiter lands (SPEC §12)
const hits = new Map<string, number[]>();
function limited(ip: string) {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < 60 * 60 * 1000);
  hits.set(ip, [...recent, now]);
  return recent.length >= 10;
}

const SCHEMA = {
  type: "object",
  properties: {
    title: { type: "string", description: "2–5 words" },
    text: { type: "string", description: "The prayer, at most 120 words, short paragraphs separated by blank lines, ending with Amen." },
    refs: { type: "array", items: { type: "string" }, description: "1–2 references copied exactly from the allowed list" },
  },
  required: ["title", "text", "refs"],
  additionalProperties: false,
};

const SYSTEM = [
  "You write short personal Christian prayers for a prayer app. Warm, simple, never preachy, no clichés.",
  'Address God directly in the first person ("Lord, I…"). At most 120 words.',
  "Respect the person's tradition (a Catholic may be comfortable asking for Mary's prayers; never contradict a tradition).",
  'You may quote or allude to Scripture ONLY from the allowed verses you are given, and list the ones you used in "refs", copied exactly.',
  "Never invent a verse or reference. Don't give medical, legal or financial advice. Don't mention AI.",
].join("\n");

const output = z.object({ title: z.string().min(1).max(80), text: z.string().min(20).max(1500), refs: z.array(z.string()) });

export const POST = handle(async (req: NextRequest) => {
  const answers = answersSchema.parse((await readJson(req)).answers ?? {});
  const fallback = () => Response.json({ ...fallbackPrayer(answers), source: "template" });
  if (!process.env.ANTHROPIC_API_KEY) return fallback();

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "local";
  if (limited(ip)) throw new HttpError(429, "Too many prayers in an hour. Please try again later.");

  const allowed = versesFor(answers.struggles);
  const user = [
    `Carrying: ${(answers.struggles ?? []).map((s) => labelOf(STRUGGLES, s)).join(", ") || "not said"}`,
    `How heavy (1–5): ${answers.burden ?? "not said"}`,
    `Tradition: ${labelOf(DENOMINATIONS, answers.denomination) || "not said"}`,
    `First name: ${answers.firstName || "not given (don't use a name)"}`,
    `Time of day they pray: ${answers.prayerTime ?? "any"}`,
    "",
    "Allowed verses (World English Bible):",
    ...allowed.map((v) => `- ${v.ref}: ${v.text}`),
  ].join("\n");

  try {
    const message = await new Anthropic({ timeout: TIMEOUT_MS, maxRetries: 0 }).messages.create({
      model: MODEL,
      max_tokens: 2000,
      system: SYSTEM,
      output_config: { effort: "low", format: { type: "json_schema", schema: SCHEMA } },
      messages: [{ role: "user", content: user }],
    });
    const block = message.content.find((b) => b.type === "text");
    if (message.stop_reason !== "end_turn" || !block) return fallback();

    const out = output.parse(JSON.parse(block.text));
    // Only citations that are really in our list survive
    const citations = allowed.filter((v) => out.refs.includes(v.ref)).slice(0, 2);
    return Response.json({ title: out.title, text: out.text, citations: citations.length ? citations : [allowed[0]], source: "ai" });
  } catch (err) {
    console.error("[sample-prayer]", err instanceof Error ? err.message : err);
    return fallback();
  }
});
