// Companion on the web: the same API the phone app uses (app/lib/api/chat.ts), signed in by the session cookie.

export type Passage = { ref: string; text: string; translation: string };
export type CrisisResource = { label: string; href: string; note: string };
export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
  category: string | null;
  createdAt: string;
  citations: Passage[];
  resources?: CrisisResource[];
  // A prayer in this answer that can be saved to My prayers; savedId once it is
  prayer?: { title: string; savedId: string | null } | null;
};

// What the reply stream sends (lib/ai/companion.ts ChatEvent)
export type ChatEvent =
  | { event: "meta"; data: { category: string } }
  | { event: "status"; data: { step: "searching" | "reading" | "writing"; refs?: string[] } }
  | { event: "delta"; data: { text: string } }
  | { event: "done"; data: { messageId: string; citations: Passage[]; prayer?: { title: string } } }
  | { event: "blocked"; data: { category: string; messageId: string; text: string; resources?: CrisisResource[] } }
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

export async function createConversation() {
  const res = await fetch("/api/chat/conversations", { method: "POST" });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ChatError(data.error ?? "Something went wrong. Please try again.", res.status, data.code);
  return data.id as string;
}

/** Sends a message and calls onEvent for each server-sent event as it arrives. */
export async function sendMessage(conversationId: string, text: string, onEvent: (e: ChatEvent) => void, signal?: AbortSignal, quickPrompt?: string) {
  const res = await fetch(`/api/chat/conversations/${conversationId}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
    body: JSON.stringify({ text, ...(quickPrompt && { quickPrompt }) }),
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
