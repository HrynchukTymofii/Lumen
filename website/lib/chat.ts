import type Anthropic from "@anthropic-ai/sdk";
import { HttpError } from "@/lib/admin-auth";
import { getPassage } from "@/lib/bible/passages";
import type { Ref } from "@/lib/bible/refs";
import { decrypt, encrypt } from "@/lib/crypto";
import type { Translation } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";

// Conversations with the companion. Message text and titles are encrypted at rest (lib/crypto.ts).

const HISTORY_TURNS = 12;

export async function listConversations(userId: string, cursor?: string) {
  const rows = await prisma.conversation.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    take: 21,
    ...(cursor && { cursor: { id: cursor }, skip: 1 }),
    select: { id: true, title: true, updatedAt: true },
  });
  return {
    conversations: rows.slice(0, 20).map((c) => ({ id: c.id, title: c.title ? decrypt(c.title) : null, updatedAt: c.updatedAt })),
    nextCursor: rows.length > 20 ? rows[19].id : null,
  };
}

export async function createConversation(userId: string, firstMessage?: string) {
  const title = firstMessage ? firstMessage.trim().replace(/\s+/g, " ").slice(0, 60) : null;
  return prisma.conversation.create({ data: { userId, title: title ? encrypt(title) : null }, select: { id: true } });
}

/** The conversation if it belongs to this user, else 404 (never reveal other people's ids). */
export async function ownConversation(userId: string, id: string) {
  const conversation = await prisma.conversation.findFirst({ where: { id, userId }, select: { id: true, title: true } });
  if (!conversation) throw new HttpError(404, "Conversation not found");
  return conversation;
}

export async function setTitleIfMissing(id: string, text: string) {
  await prisma.conversation.updateMany({ where: { id, title: null }, data: { title: encrypt(text.trim().replace(/\s+/g, " ").slice(0, 60)) } });
}

/** Messages for the app, with citations resolved to verse text in the reader's translation. */
export async function getConversation(userId: string, id: string, translation: Translation) {
  const conversation = await ownConversation(userId, id);
  const messages = await prisma.message.findMany({ where: { conversationId: id }, orderBy: { createdAt: "asc" } });
  return {
    id,
    title: conversation.title ? decrypt(conversation.title) : null,
    messages: await Promise.all(
      messages.map(async (m) => ({
        id: m.id,
        role: m.role,
        text: decrypt(m.content),
        category: m.category,
        createdAt: m.createdAt,
        citations: (await Promise.all((m.citations as Ref[]).map((r) => getPassage(r, translation)))).filter(Boolean),
      })),
    ),
  };
}

/** The last turns as model input. Exchanges answered with a fixed reply (off-topic, jailbreak, abuse) are left out. */
export async function historyFor(conversationId: string): Promise<Anthropic.Beta.BetaMessageParam[]> {
  const rows = await prisma.message.findMany({
    where: { conversationId, category: { in: ["on_topic", "crisis"] } },
    orderBy: { createdAt: "desc" },
    take: HISTORY_TURNS * 2,
    select: { role: true, content: true },
  });
  const turns = rows.reverse().map((m) => {
    const text = decrypt(m.content);
    return { role: m.role, content: m.role === "user" ? `<message>\n${text}\n</message>` : text } as const;
  });
  // The model needs the history to start with a user turn
  while (turns.length && turns[0].role !== "user") turns.shift();
  return turns;
}

export async function deleteConversation(userId: string, id: string) {
  await ownConversation(userId, id);
  await prisma.conversation.delete({ where: { id } });
}
