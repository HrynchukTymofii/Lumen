import { router, useLocalSearchParams } from "expo-router";
import { type ComponentRef, useEffect, useRef, useState } from "react";
import { KeyboardAvoidingView, Linking, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Light, type LightState } from "@/components/Light";
import { IconButton } from "@/components/ui/Button";
import { BackIcon, BookIcon, SendIcon } from "@/components/ui/icons";
import { useColors } from "@/components/ui/theme";
import { useAuth } from "@/context/AuthContext";
import { ChatError, getConversation, sendMessage } from "@/lib/api/chat";
import { errorMessage } from "@/lib/api/client";
import type { ChatMessage, CrisisResource } from "@/lib/api/types";
import { reportError } from "@/lib/errorReporting";

// Chat (SPEC §10.2 Companion): the reply streams in as it's written; verses it cites show under it as cards.
// Crisis replies carry call / text buttons. Errors before the stream (daily limit, too fast) show above the input.

const MAX_LENGTH = 1000;

export default function ChatScreen() {
  const { id, prompt } = useLocalSearchParams<{ id: string; prompt?: string }>();
  const { token } = useAuth();
  const insets = useSafeAreaInsets();
  const c = useColors();
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null);
  const abort = useRef<AbortController | null>(null);

  const [title, setTitle] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[] | null>(null);
  const [input, setInput] = useState(prompt ?? "");
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [quotaHit, setQuotaHit] = useState(false);

  useEffect(() => {
    getConversation(id).then(
      (conv) => {
        setTitle(conv.title);
        setMessages(conv.messages);
      },
      (err) => {
        reportError(err);
        setNotice(errorMessage(err));
        setMessages([]);
      },
    );
  }, [id]);

  // Leaving the screen stops a reply that is still streaming
  useEffect(() => () => abort.current?.abort(), []);

  // Changes the last message (the reply being written)
  const updateReply = (change: (m: ChatMessage) => ChatMessage) =>
    setMessages((list) => (list ? [...list.slice(0, -1), change(list[list.length - 1])] : list));

  const send = async () => {
    const text = input.trim();
    if (!text || sending) return;
    setInput("");
    setNotice(null);
    setSending(true);
    if (!title) setTitle(text.slice(0, 60));

    const now = new Date().toISOString();
    setMessages((list) => [
      ...(list ?? []),
      { id: `local-${now}`, role: "user", text, category: null, createdAt: now, citations: [] },
      { id: `reply-${now}`, role: "assistant", text: "", category: null, createdAt: now, citations: [] },
    ]);

    const controller = new AbortController();
    abort.current = controller;
    try {
      await sendMessage(
        id,
        text,
        token,
        (e) => {
          if (e.event === "delta") updateReply((m) => ({ ...m, text: m.text + e.data.text }));
          else if (e.event === "done") updateReply((m) => ({ ...m, id: e.data.messageId, citations: e.data.citations }));
          else if (e.event === "blocked")
            updateReply((m) => ({ ...m, id: e.data.messageId, text: e.data.text, category: e.data.category, resources: e.data.resources }));
          else if (e.event === "error") {
            updateReply((m) => ({ ...m, text: m.text || e.data.message }));
          }
        },
        controller.signal,
      );
    } catch (err) {
      if (controller.signal.aborted) return;
      // Nothing was written: take back both bubbles and give the text back to edit or resend
      setMessages((list) => (list ? list.slice(0, -2) : list));
      setInput(text);
      if (!(err instanceof ChatError)) reportError(err);
      setQuotaHit(err instanceof ChatError && err.code === "quota");
      setNotice(
        err instanceof ChatError
          ? err.code === "quota"
            ? "You’ve used today’s messages. They come back tomorrow, or unlimited with Premium."
            : err.message
          : "No connection. Check your internet and try again.",
      );
    } finally {
      setSending(false);
    }
  };

  const last = messages?.[messages.length - 1];
  const lightState: LightState = sending ? (last?.text ? "speaking" : "thinking") : input ? "listening" : "idle";

  return (
    <KeyboardAvoidingView className="flex-1 bg-bg" behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View className="flex-row items-center gap-3 border-b border-line px-4 pb-3" style={{ paddingTop: insets.top + 8 }}>
        <IconButton label="Back" onPress={() => (router.canGoBack() ? router.back() : router.replace("/companion"))}>
          <BackIcon color={c.ink} />
        </IconButton>
        <Text className="flex-1 font-sans-bold text-base text-ink" numberOfLines={1}>
          {title ?? "New conversation"}
        </Text>
        <Light size={36} state={lightState} />
      </View>

      <ScrollView
        ref={scroll}
        className="flex-1"
        contentContainerStyle={{ padding: 16, gap: 12, flexGrow: 1 }}
        onContentSizeChange={() => scroll.current?.scrollToEnd({ animated: true })}
        keyboardShouldPersistTaps="handled"
      >
        {messages?.length === 0 && (
          <View className="flex-1 items-center justify-center px-4 py-10">
            <Light size={90} state={lightState} />
            <Text className="mt-5 text-center font-display text-2xl text-ink">What’s on your heart?</Text>
            <Text className="mt-2 text-center font-sans text-base leading-6 text-muted">
              Ask about a passage, ask for a prayer, or just talk. Answers quote real verses.
            </Text>
          </View>
        )}
        {messages?.map((m) => (m.role === "user" ? <UserBubble key={m.id} text={m.text} /> : <Reply key={m.id} message={m} />))}
      </ScrollView>

      {notice && <Text className="px-5 pb-2 font-sans text-sm text-danger">{notice}</Text>}
      {quotaHit && (
        <Pressable onPress={() => router.push("/paywall")} accessibilityRole="button" className="mx-4 mb-2 rounded-full bg-ink py-3 active:opacity-80">
          <Text className="text-center font-sans-bold text-sm text-bg">Try Premium free for 7 days</Text>
        </Pressable>
      )}

      <View className="flex-row items-end gap-2 border-t border-line bg-card px-3 pt-2.5" style={{ paddingBottom: insets.bottom + 10 }}>
        <TextInput
          value={input}
          onChangeText={setInput}
          placeholder="Write a message"
          placeholderTextColor={c.dim}
          multiline
          maxLength={MAX_LENGTH}
          className="max-h-32 min-h-11 flex-1 rounded-3xl bg-bg px-4 py-2.5 font-sans text-base text-ink"
          autoFocus={Boolean(prompt)}
        />
        <Pressable
          onPress={send}
          disabled={!input.trim() || sending}
          accessibilityRole="button"
          accessibilityLabel="Send"
          className={`h-11 w-11 items-center justify-center rounded-full bg-ink ${!input.trim() || sending ? "opacity-30" : ""}`}
        >
          <SendIcon color={c.bg} />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

function UserBubble({ text }: { text: string }) {
  return (
    <View className="max-w-[85%] self-end rounded-3xl rounded-br-lg bg-olive px-4 py-3">
      <Text className="font-sans text-base leading-6 text-on-pastel">{text}</Text>
    </View>
  );
}

function Reply({ message }: { message: ChatMessage }) {
  const c = useColors();
  return (
    <View className="max-w-[92%] gap-2 self-start">
      <View className="rounded-3xl rounded-bl-lg bg-card px-4 py-3">
        {message.text ? (
          <Text className="font-sans text-base leading-6 text-ink">{message.text}</Text>
        ) : (
          <Text className="font-sans text-base text-dim">…</Text>
        )}
      </View>
      {message.citations.map((v) => (
        <View key={v.ref} className="rounded-2xl border-[1.5px] border-olive-deep/40 px-4 py-3">
          <View className="flex-row items-center gap-2">
            <BookIcon size={15} color={c.oliveDeep} />
            <Text className="font-sans-bold text-sm text-olive-deep">
              {v.ref} · {v.translation}
            </Text>
          </View>
          <Text className="mt-1 font-serif text-[15px] leading-6 text-muted">{v.text}</Text>
        </View>
      ))}
      {message.resources && <CrisisCard resources={message.resources} />}
    </View>
  );
}

function CrisisCard({ resources }: { resources: CrisisResource[] }) {
  return (
    <View className="gap-2 rounded-2xl bg-rose px-4 py-4">
      <Text className="font-sans-bold text-[15px] text-on-pastel">You don’t have to go through this alone</Text>
      {resources.map((r) => (
        <Pressable
          key={r.href}
          onPress={() => Linking.openURL(r.href)}
          accessibilityRole="button"
          className="rounded-full bg-ink px-4 py-3 active:opacity-80"
        >
          <Text className="text-center font-sans-bold text-base text-bg">{r.label}</Text>
          <Text className="text-center font-sans text-xs text-bg/70">{r.note}</Text>
        </Pressable>
      ))}
    </View>
  );
}
