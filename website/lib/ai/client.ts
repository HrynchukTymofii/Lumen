import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/prisma";

// Claude for the companion (SPEC §7.1). One client, the model ids, and cost tracking per call (AiUsage).

export const MODELS = {
  // Chat answers, "turn into a prayer", the daily personal prayer
  main: process.env.AI_MODEL_MAIN ?? "claude-sonnet-5-5",
  // Safety classifier, titles, memory summaries
  fast: process.env.AI_MODEL_FAST ?? "claude-haiku-5-5",
} as const;

export const aiConfigured = () => Boolean(process.env.ANTHROPIC_API_KEY);

let client: Anthropic | null = null;
export function anthropic() {
  // Short timeout for the fast model; streams set their own
  client ??= new Anthropic({ timeout: 60_000, maxRetries: 1 });
  return client;
}

// USD per million tokens (verified 31.10.2026). Cache writes are 1.25× input, cache reads 0.1×.
const PRICES: Record<string, { input: number; output: number }> = {
  "claude-sonnet-5-5": { input: 2, output: 10 },
  "claude-haiku-5-5": { input: 0.1, output: 0.5 },
  "claude-opus-5-5": { input: 4, output: 20 },
};

type Usage = {
  input_tokens: number;
  output_tokens: number;
  cache_read_input_tokens?: number | null;
  cache_creation_input_tokens?: number | null;
};

export function costMicroUsd(model: string, usage: Usage) {
  const p = PRICES[model];
  if (!p) return 0;
  const cached = usage.cache_read_input_tokens ?? 0;
  const written = usage.cache_creation_input_tokens ?? 0;
  const dollars =
    (usage.input_tokens * p.input + written * p.input * 1.25 + cached * p.input * 0.1 + usage.output_tokens * p.output) / 1_000_000;
  return Math.round(dollars * 1_000_000);
}

export async function recordUsage(input: { userId: string | null; kind: string; model: string; usage: Usage; latencyMs?: number }) {
  await prisma.aiUsage
    .create({
      data: {
        userId: input.userId,
        kind: input.kind,
        model: input.model,
        inputTokens: input.usage.input_tokens + (input.usage.cache_creation_input_tokens ?? 0),
        cachedTokens: input.usage.cache_read_input_tokens ?? 0,
        outputTokens: input.usage.output_tokens,
        costMicroUsd: costMicroUsd(input.model, input.usage),
        latencyMs: input.latencyMs,
      },
    })
    .catch((err) => console.error("[ai] usage not recorded", err));
}
