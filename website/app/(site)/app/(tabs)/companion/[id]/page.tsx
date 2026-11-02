import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Light } from "@/components/kit";
import { HttpError } from "@/lib/admin-auth";
import { requirePageUser } from "@/lib/auth/current";
import { getConversation } from "@/lib/chat";
import type { ChatMessage } from "../chat-api";
import { Chat } from "./chat";

export const metadata: Metadata = { title: "Companion" };

export default function ChatPage(props: PageProps<"/app/companion/[id]">) {
  return (
    <Suspense fallback={<Light size={56} state="thinking" />}>
      <ChatLoader {...props} />
    </Suspense>
  );
}

async function ChatLoader({ params, searchParams }: PageProps<"/app/companion/[id]">) {
  const { id } = await params;
  const user = await requirePageUser(`/app/companion/${id}`);
  const conversation = await getConversation(user.id, id, user.translation).catch((err) => {
    if (err instanceof HttpError && err.status === 404) notFound();
    throw err;
  });
  const sp = await searchParams;
  const prompt = typeof sp.prompt === "string" ? sp.prompt.slice(0, 1000) : "";
  const messages = conversation.messages.map((m) => ({ ...m, createdAt: m.createdAt.toISOString() })) as ChatMessage[];

  return (
    <Chat
      key={id}
      id={id}
      title={conversation.title}
      initial={messages}
      prompt={prompt}
      autoSend={sp.send === "1"}
      aiEnabled={user.aiEnabled}
    />
  );
}
