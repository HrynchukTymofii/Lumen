import Anthropic from "@anthropic-ai/sdk";
import { getPassages, type Passage } from "@/lib/bible/passages";
import { retrieve } from "@/lib/bible/search";
import { encrypt } from "@/lib/crypto";
import { EMBED_MODEL } from "@/lib/ai/embed";
import { prisma } from "@/lib/prisma";
import type { User } from "@/lib/generated/prisma/client";
import { classify, type Category } from "./classify";
import { MODELS, aiConfigured, anthropic, recordUsage } from "./client";
import { MarkerStripper } from "./markers";
import { COMPANION_RULES, CRISIS_RESOURCES, FIXED_REPLIES, passagesBlock, profileBlock } from "./prompts/companion";
import { historyFor } from "@/lib/chat";

// One companion message (SPEC §7.2): classify → quota → retrieve verses → stream the answer → validate
// citations → save both messages encrypted. The route turns the events into SSE.

export const FREE_DAILY = 5;
export const PREMIUM_DAILY = 100; // soft cap against runaway cost

export type CitationOut = Passage;

export type ChatEvent =
  | { event: "meta"; data: { category: Category; quota: Quota } }
  | { event: "delta"; data: { text: string } }
  | { event: "done"; data: { messageId: string; citations: CitationOut[]; refused?: boolean } }
  | {
      event: "blocked";
      data: { category: Category; messageId: string; text: string; resources?: typeof CRISIS_RESOURCES };
    }
  | { event: "error"; data: { message: string } };

export type Quota = { used: number; limit: number; date: string };

// Free users count messages per day in their own timezone
export function localDate(timezone: string) {
  try {
    return new Intl.DateTimeFormat("en-CA", { timeZone: timezone }).format(new Date());
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

export async function getQuota(user: Pick<User, "id" | "timezone">, premium: boolean): Promise<Quota> {
  const date = localDate(user.timezone);
  const row = await prisma.chatQuota.findUnique({ where: { userId_date: { userId: user.id, date } } });
  return { used: row?.count ?? 0, limit: premium ? PREMIUM_DAILY : FREE_DAILY, date };
}

// Claims that must never appear in an answer (SPEC §7.2 step 8). Can't be unsent mid-stream, so they flag
// the message for review.
const BANNED = /\b(I am|I'm) (God|Jesus|the Holy Spirit|the Lord|your (priest|pastor))\b|\bas your (priest|pastor)\b/i;

const isFixed = (c: Category): c is "off_topic" | "jailbreak" | "abuse" | "crisis" => c !== "on_topic";

async function saveExchange(input: {
  conversationId: string;
  userText: string;
  category: Category;
  reply: string;
  citations?: Passage[];
  flagged?: boolean;
}) {
  const { conversationId, category } = input;
  const flagged = category === "crisis" || category === "abuse" || Boolean(input.flagged);
  const [, assistant] = await prisma.$transaction([
    prisma.message.create({ data: { conversationId, role: "user", content: encrypt(input.userText), category, flagged } }),
    prisma.message.create({
      data: {
        conversationId,
        role: "assistant",
        content: encrypt(input.reply),
        category,
        flagged: Boolean(input.flagged),
        citations: (input.citations ?? []).map(({ bookId, chapter, verseStart, verseEnd }) => ({ bookId, chapter, verseStart, verseEnd })),
      },
    }),
    prisma.conversation.update({ where: { id: conversationId }, data: { updatedAt: new Date() } }),
  ]);
  return assistant.id;
}

/** Step 1: the safety check, before any stream opens (the route answers 402 when the quota is used up). */
export async function screen(user: User, text: string, premium: boolean) {
  const [classification, quota] = await Promise.all([classify(text, user.id), getQuota(user, premium)]);
  return { ...classification, quota };
}

/** Steps 2+: the reply as events. `signal` aborts the model call when the app disconnects. */
export async function* reply(input: {
  user: User;
  conversationId: string;
  text: string;
  category: Category;
  topics: string[];
  quota: Quota;
  signal?: AbortSignal;
}): AsyncGenerator<ChatEvent> {
  const { user, conversationId, text, category } = input;
  yield { event: "meta", data: { category, quota: input.quota } };

  // Off-topic, jailbreak, abuse and crisis get fixed replies: no main model, no quota used
  if (isFixed(category)) {
    const replyText = FIXED_REPLIES[category];
    const messageId = await saveExchange({ conversationId, userText: text, category, reply: replyText });
    yield {
      event: "blocked",
      data: { category, messageId, text: replyText, ...(category === "crisis" && { resources: CRISIS_RESOURCES }) },
    };
    return;
  }

  if (!aiConfigured()) {
    yield { event: "error", data: { message: "The companion isn't set up yet (ANTHROPIC_API_KEY)." } };
    return;
  }

  const history = await historyFor(conversationId);
  const lastUser = [...history].reverse().find((m) => m.role === "user");
  const { refs, embedTokens } = await retrieve({
    message: text,
    context: typeof lastUser?.content === "string" ? lastUser.content : undefined,
    topics: input.topics,
  });
  if (embedTokens) await recordUsage({ userId: user.id, kind: "embed", model: EMBED_MODEL, usage: { input_tokens: embedTokens, output_tokens: 0 } });
  const passages = await getPassages(refs, user.translation);

  const started = Date.now();
  const stripper = new MarkerStripper();
  let shown = "";
  let final: Anthropic.Beta.BetaMessage;
  try {
    const stream = anthropic().beta.messages.stream(
      {
        model: MODELS.main,
        max_tokens: 4000,
        // A safety decline in some categories is retried server-side on another model (SPEC §7.1)
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
        output_config: { effort: "low" },
        system: [
          { type: "text", text: COMPANION_RULES, cache_control: { type: "ephemeral" } },
          { type: "text", text: profileBlock({ ...user, struggles: user.struggles }) },
        ],
        messages: [...history, { role: "user", content: `${passagesBlock(passages)}\n\n<message>\n${text}\n</message>` }],
      },
      { signal: input.signal, timeout: 90_000 },
    );
    for await (const event of stream) {
      if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
        const piece = stripper.push(event.delta.text);
        if (piece) {
          shown += piece;
          yield { event: "delta", data: { text: piece } };
        }
      }
    }
    final = await stream.finalMessage();
  } catch (err) {
    if (input.signal?.aborted) return; // the app went away: nothing saved, no quota used
    console.error("[companion] model call failed", err);
    yield { event: "error", data: { message: FIXED_REPLIES.unavailable } };
    return;
  }

  const rest = stripper.flush();
  if (rest) {
    shown += rest;
    yield { event: "delta", data: { text: rest } };
  }
  await recordUsage({ userId: user.id, kind: "chat", model: final.model, usage: final.usage, latencyMs: Date.now() - started });

  const refused = final.stop_reason === "refusal";
  if (refused && !shown.trim()) {
    shown = FIXED_REPLIES.refusal;
    yield { event: "delta", data: { text: shown } };
  }

  // Only labels we actually gave, in the order the answer used them
  const citations = stripper.cited.map((n) => passages[n - 1]).filter((p): p is Passage => Boolean(p));
  const messageId = await saveExchange({
    conversationId,
    userText: text,
    category,
    reply: shown.trim(),
    citations,
    flagged: refused || BANNED.test(shown),
  });
  await prisma.chatQuota.upsert({
    where: { userId_date: { userId: user.id, date: input.quota.date } },
    create: { userId: user.id, date: input.quota.date, count: 1 },
    update: { count: { increment: 1 } },
  });
  yield { event: "done", data: { messageId, citations, ...(refused && { refused }) } };
}
