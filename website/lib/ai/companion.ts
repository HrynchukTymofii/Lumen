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

// Messages per week (Monday to Sunday in the user's timezone). Only on-topic answers count.
export const FREE_WEEKLY = 10;
export const PREMIUM_WEEKLY = 200; // soft cap against runaway cost

export type CitationOut = Passage;

export type ChatEvent =
  | { event: "meta"; data: { category: Category; quota: Quota } }
  // Progress for the "what I'm doing" line while there's no text yet: searching → reading (with refs) → writing
  | { event: "status"; data: { step: "searching" | "reading" | "writing"; refs?: string[] } }
  | { event: "delta"; data: { text: string } }
  // prayer: the answer holds a prayer the user can save to My prayers (POST /api/prayers/personal/from-message)
  | { event: "done"; data: { messageId: string; citations: CitationOut[]; refused?: boolean; prayer?: { title: string } } }
  | {
      event: "blocked";
      data: { category: Category; messageId: string; text: string; resources?: typeof CRISIS_RESOURCES };
    }
  | { event: "error"; data: { message: string } };

// date: the Monday the week started (YYYY-MM-DD); resetsOn: the next Monday
export type Quota = { used: number; limit: number; date: string; resetsOn: string };

// The user's calendar date in their own timezone
export function localDate(timezone: string) {
  try {
    return new Intl.DateTimeFormat("en-CA", { timeZone: timezone }).format(new Date());
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

const addDays = (date: string, n: number) => {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

// The Monday of the user's current week. ChatQuota rows are keyed by it, so one row counts a whole week.
export function weekStart(timezone: string) {
  const today = localDate(timezone);
  const weekday = new Date(`${today}T00:00:00Z`).getUTCDay(); // 0 = Sunday
  return addDays(today, -((weekday + 6) % 7));
}

export async function getQuota(user: Pick<User, "id" | "timezone">, premium: boolean): Promise<Quota> {
  const date = weekStart(user.timezone);
  const row = await prisma.chatQuota.findUnique({ where: { userId_date: { userId: user.id, date } } });
  return { used: row?.count ?? 0, limit: premium ? PREMIUM_WEEKLY : FREE_WEEKLY, date, resetsOn: addDays(date, 7) };
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
  prayer?: { title: string; text: string } | null;
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
        prayer: input.prayer ? encrypt(JSON.stringify(input.prayer)) : null,
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

  yield { event: "status", data: { step: "searching" } };
  const history = await historyFor(conversationId);
  const lastUser = [...history].reverse().find((m) => m.role === "user");
  const { refs, embedTokens } = await retrieve({
    message: text,
    context: typeof lastUser?.content === "string" ? lastUser.content : undefined,
    topics: input.topics,
  });
  if (embedTokens) await recordUsage({ userId: user.id, kind: "embed", model: EMBED_MODEL, usage: { input_tokens: embedTokens, output_tokens: 0 } });
  const passages = await getPassages(refs, user.translation);
  if (passages.length) yield { event: "status", data: { step: "reading", refs: passages.slice(0, 3).map((p) => p.ref) } };

  const started = Date.now();
  const stripper = new MarkerStripper();
  let shown = "";
  let final: Anthropic.Beta.BetaMessage;
  yield { event: "status", data: { step: "writing" } };
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

  // A prayer the answer wrapped in [[PRAYER]] markers, offered for saving
  const prayer = refused ? null : stripper.prayerIn(shown);
  // Only labels we actually gave, in the order the answer used them
  const citations = stripper.cited.map((n) => passages[n - 1]).filter((p): p is Passage => Boolean(p));
  const messageId = await saveExchange({
    conversationId,
    userText: text,
    category,
    reply: shown.trim(),
    citations,
    flagged: refused || BANNED.test(shown),
    prayer,
  });
  await prisma.chatQuota.upsert({
    where: { userId_date: { userId: user.id, date: input.quota.date } },
    create: { userId: user.id, date: input.quota.date, count: 1 },
    update: { count: { increment: 1 } },
  });
  yield { event: "done", data: { messageId, citations, ...(refused && { refused }), ...(prayer && { prayer: { title: prayer.title } }) } };
}
