import { fetch } from "expo/fetch";
import { SITE_URL } from "@/lib/config";
import api from "./client";
import type { ChatMessage, ConversationSummary, CrisisResource, MessageCategory, Passage, Quota } from "./types";

// Companion (website/app/api/chat/*, SPEC §6.6)

export async function getQuota() {
  const { data } = await api.get<Quota>("/chat/quota");
  return data;
}

export async function listConversations() {
  const { data } = await api.get<{ conversations: ConversationSummary[]; nextCursor: string | null }>("/chat/conversations");
  return data.conversations;
}

export async function createConversation() {
  const { data } = await api.post<{ id: string }>("/chat/conversations");
  return data.id;
}

export async function getConversation(id: string) {
  const { data } = await api.get<{ id: string; title: string | null; messages: ChatMessage[] }>(`/chat/conversations/${id}`);
  return data;
}

export async function deleteConversation(id: string) {
  await api.delete(`/chat/conversations/${id}`);
}

// What the reply stream sends (website/lib/ai/companion.ts ChatEvent)
export type ChatEvent =
  | { event: "meta"; data: { category: MessageCategory; quota: Omit<Quota, "premium"> } }
  | { event: "status"; data: { step: "searching" | "reading" | "writing"; refs?: string[] } }
  | { event: "delta"; data: { text: string } }
  | { event: "done"; data: { messageId: string; citations: Passage[]; refused?: boolean } }
  | { event: "blocked"; data: { category: MessageCategory; messageId: string; text: string; resources?: CrisisResource[] } }
  | { event: "error"; data: { message: string } };

// Thrown before the stream starts: 402 quota, 403 companion off, 429 too fast
export class ChatError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
  ) {
    super(message);
  }
}

/**
 * Sends a message and calls onEvent for each server-sent event as it arrives. axios can't read a streaming body
 * in React Native, so this uses expo/fetch.
 */
export async function sendMessage(
  conversationId: string,
  text: string,
  token: string | null,
  onEvent: (e: ChatEvent) => void,
  signal?: AbortSignal,
) {
  const res = await fetch(`${SITE_URL}/api/chat/conversations/${conversationId}/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "text/event-stream",
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    body: JSON.stringify({ text }),
    signal,
  });

  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string; code?: string } | null;
    throw new ChatError(body?.error ?? "Something went wrong. Please try again.", res.status, body?.code);
  }
  if (!res.body) throw new ChatError("Something went wrong. Please try again.", 0);

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    // Events end with a blank line: "event: name\ndata: {json}\n\n"
    let end: number;
    while ((end = buffer.indexOf("\n\n")) !== -1) {
      const chunk = buffer.slice(0, end);
      buffer = buffer.slice(end + 2);
      const name = /^event: (.*)$/m.exec(chunk)?.[1];
      const data = /^data: (.*)$/m.exec(chunk)?.[1];
      if (name && data) onEvent({ event: name, data: JSON.parse(data) } as ChatEvent);
    }
  }
}
