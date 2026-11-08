import { router, useLocalSearchParams } from "expo-router";
import { type ComponentRef, useEffect, useRef, useState } from "react";
import Animated, { FadeInDown, FadeOut } from "react-native-reanimated";
import { ActivityIndicator, KeyboardAvoidingView, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Light, type LightState } from "@/components/Light";
import { IconButton } from "@/components/ui/Button";
import { CrisisCard } from "@/components/CrisisCard";
import { BackIcon, BookIcon, CheckIcon, MicIcon, PrayersIcon, SendIcon } from "@/components/ui/icons";
import { useColors } from "@/components/ui/theme";
import { useAuth } from "@/context/AuthContext";
import { useKeyboardShown } from "@/hooks/useKeyboardShown";
import { useVoiceInput } from "@/hooks/useVoiceInput";
import { ChatError, getConversation, sendMessage } from "@/lib/api/chat";
import { errorMessage } from "@/lib/api/client";
import { savePrayerFromMessage } from "@/lib/api/prayers";
import type { ChatMessage } from "@/lib/api/types";
import { reportError } from "@/lib/errorReporting";
import { reviewMoment } from "@/lib/review";
import { openPaywall } from "@/lib/account";

// Chat (SPEC §10.2 Companion): the reply streams in as it's written; verses it cites show under it as cards.
// Crisis replies carry call / text buttons. Errors before the stream (weekly limit, too fast) show above the input.
// Until the first words arrive, the reply shows what the companion is doing (reading, searching, writing).

const MAX_LENGTH = 1000;

export default function ChatScreen() {
  // prompt: put in the input box; send=1 also sends it (a question asked on Home or about a verse)
  const { id, prompt, send: autoSend } = useLocalSearchParams<{ id: string; prompt?: string; send?: string }>();
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
  const [status, setStatus] = useState<string | null>(null);
  const keyboardShown = useKeyboardShown();

  // A multiline input grows with long (e.g. dictated) text but doesn't shrink back when cleared from code (iOS),
  // so sending puts in a fresh one, focused again if the old one was
  const inputRef = useRef<ComponentRef<typeof TextInput>>(null);
  const [fresh, setFresh] = useState({ key: 0, focus: false });
  const resetInput = (text: string) => {
    setInput(text);
    setFresh((f) => ({ key: f.key + 1, focus: inputRef.current?.isFocused() ?? false }));
  };

  // What was typed before the mic was tapped; the spoken words go after it
  const typed = useRef("");
  const voice = useVoiceInput((said) => setInput((typed.current ? `${typed.current} ` : "") + said));
  const toggleVoice = () => {
    if (voice.listening) return voice.stop();
    typed.current = input.trim();
    voice.start();
  };

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

  // Replies received on this visit, and the person's messages in the whole conversation
  const talked = useRef({ replies: 0, mine: 0 });
  useEffect(() => {
    talked.current.mine = messages?.filter((m) => m.role === "user").length ?? 0;
  }, [messages]);

  // Leaving the screen stops a reply that is still streaming. Leaving a conversation of 3+ messages that went on
  // here is a moment to ask how the companion is helping (lib/review.ts)
  useEffect(() => {
    const t = talked;
    return () => {
      abort.current?.abort();
      if (t.current.replies > 0 && t.current.mine >= 3) reviewMoment("companion");
    };
  }, []);

  // Changes the last message (the reply being written)
  const updateReply = (change: (m: ChatMessage) => ChatMessage) =>
    setMessages((list) => (list ? [...list.slice(0, -1), change(list[list.length - 1])] : list));

  const send = async () => {
    const text = input.trim();
    if (!text || sending) return;
    if (voice.listening) voice.cancel();
    resetInput("");
    setNotice(null);
    setQuotaHit(false);
    setSending(true);
    setStatus("Reading your message");
    if (!title) setTitle(text.slice(0, 60));

    const now = new Date().toISOString();
    setMessages((list) => [
      ...(list ?? []),
      { id: `local-${now}`, role: "user", text, category: null, createdAt: now, citations: [] },
      { id: `reply-${now}`, role: "assistant", text: "", category: null, createdAt: now, citations: [] },
    ]);

    const controller = new AbortController();
    abort.current = controller;
    let got = false; // any reply text or a finished/blocked reply
    try {
      await sendMessage(
        id,
        text,
        token,
        (e) => {
          if (e.event === "meta" && e.data.category === "on_topic") setStatus("Thinking about what you shared");
          else if (e.event === "status") setStatus(statusLine(e.data));
          else if (e.event === "delta") {
            got = true;
            updateReply((m) => ({ ...m, text: m.text + e.data.text }));
          } else if (e.event === "done") updateReply((m) => ({ ...m, id: e.data.messageId, citations: e.data.citations, prayer: e.data.prayer ? { title: e.data.prayer.title, savedId: null } : null }));
          else if (e.event === "blocked") {
            got = true;
            updateReply((m) => ({ ...m, id: e.data.messageId, text: e.data.text, category: e.data.category, resources: e.data.resources }));
          } else if (e.event === "error") {
            got = true;
            updateReply((m) => ({ ...m, text: m.text || e.data.message }));
          }
        },
        controller.signal,
      );
      // The connection closed without a word (e.g. the server timed out): same as an error before the stream
      if (!got && !controller.signal.aborted) throw new ChatError("The reply didn’t come through. Please try again.", 0);
      if (got) talked.current.replies += 1;
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
            ? null // shown as the gentle card above the input
            : err.message
          : "No connection. Check your internet and try again.",
      );
    } finally {
      setSending(false);
      setStatus(null);
    }
  };

  // Sends the handed-over question once the (empty) conversation has loaded
  const autoSent = useRef(false);
  useEffect(() => {
    if (autoSend !== "1" || autoSent.current || !messages || messages.length || !input.trim()) return;
    autoSent.current = true;
    send();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, autoSend]);

  const last = messages?.[messages.length - 1];
  const lightState: LightState = sending ? (last?.text ? "speaking" : "thinking") : input ? "listening" : "idle";

  return (
    <KeyboardAvoidingView className="flex-1 bg-bg" behavior="padding">
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
        {messages?.map((m) => (m.role === "user" ? <UserBubble key={m.id} text={m.text} /> : <Reply key={m.id} message={m} status={m === last ? status : null} />))}
      </ScrollView>

      {(notice ?? voice.error) && <Text className="px-5 pb-2 font-sans text-sm text-danger">{notice ?? voice.error}</Text>}
      {quotaHit && (
        // Someone may have just opened up about something hard: no "limit reached", and their words stay in the box
        <View className="mx-4 mb-2 gap-3 rounded-3xl bg-card px-5 py-4">
          <Text className="font-sans text-base leading-6 text-ink">
            Thank you for sharing this with me. We’ve reached the end of this week’s conversations, and I’ll be here again
            on Monday. Your message is saved below.
          </Text>
          <Text className="font-sans text-sm leading-5 text-muted">
            Until then, you could bring it to God in prayer, or share it with someone you trust.
          </Text>
          <Pressable onPress={() => openPaywall("companion_quota")} accessibilityRole="button" className="rounded-full bg-ink py-3 active:opacity-80">
            <Text className="text-center font-sans-bold text-sm text-bg">Keep talking with Premium</Text>
          </Pressable>
        </View>
      )}

      {/* The keyboard covers the home-indicator area, so its inset only applies while the keyboard is down */}
      <View
        className="flex-row items-end gap-2 border-t border-line bg-card px-3 pt-2.5"
        style={{ paddingBottom: (keyboardShown ? 0 : insets.bottom) + 10 }}
      >
        <TextInput
          key={fresh.key}
          ref={inputRef}
          value={input}
          onChangeText={setInput}
          placeholder="Write a message"
          placeholderTextColor={c.dim}
          multiline
          maxLength={MAX_LENGTH}
          className="max-h-32 min-h-11 flex-1 rounded-3xl bg-bg px-4 py-2.5 font-sans text-base text-ink"
          autoFocus={fresh.key === 0 ? Boolean(prompt) && autoSend !== "1" : fresh.focus}
        />
        {voice.available && (
          <Pressable
            onPress={toggleVoice}
            accessibilityRole="button"
            accessibilityLabel={voice.listening ? "Stop speaking" : "Speak a message"}
            className={`h-11 w-11 items-center justify-center rounded-full ${voice.listening ? "bg-olive" : "bg-bg"}`}
          >
            {voice.listening ? <Light size={26} state="listening" /> : <MicIcon color={c.ink} />}
          </Pressable>
        )}
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

function statusLine(s: { step: string; refs?: string[] }) {
  if (s.step === "searching") return "Searching the Scriptures";
  if (s.step === "reading") return s.refs?.length ? `Reading ${s.refs.join(", ")}` : "Reading the passages";
  return "Writing a reply";
}

function Reply({ message, status }: { message: ChatMessage; status: string | null }) {
  const c = useColors();
  return (
    <View className="max-w-[92%] gap-2 self-start">
      <View className="rounded-3xl rounded-bl-lg bg-card px-4 py-3">
        {message.text ? (
          <Text className="font-sans text-base leading-6 text-ink">{message.text}</Text>
        ) : (
          // Each new step slides in; the key makes Reanimated treat it as a new element
          <Animated.Text
            key={status ?? "wait"}
            entering={FadeInDown.duration(260)}
            exiting={FadeOut.duration(120)}
            className="font-sans text-[15px] italic text-muted"
          >
            {status ? `${status}…` : "…"}
          </Animated.Text>
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
      {message.prayer && <SavePrayer messageId={message.id} prayer={message.prayer} />}
      {message.resources && <CrisisCard resources={message.resources} />}
    </View>
  );
}

// "Save to My prayers" under an answer that holds a prayer; then "Saved · Open"
function SavePrayer({ messageId, prayer }: { messageId: string; prayer: { title: string; savedId: string | null } }) {
  const c = useColors();
  const [savedId, setSavedId] = useState(prayer.savedId);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      setSavedId((await savePrayerFromMessage(messageId)).id);
    } catch (err) {
      reportError(err);
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };
  return (
    <View className="gap-1">
      <Pressable
        onPress={savedId ? () => router.push(`/personal-prayer/${savedId}`) : save}
        disabled={saving}
        accessibilityRole="button"
        className="flex-row items-center gap-2 self-start rounded-full border-[1.5px] border-olive-deep/40 px-4 py-2.5 active:opacity-70"
      >
        {saving ? <ActivityIndicator size="small" color={c.oliveDeep} /> : savedId ? <CheckIcon size={16} color={c.oliveDeep} /> : <PrayersIcon size={16} color={c.oliveDeep} />}
        <Text className="font-sans-bold text-sm text-olive-deep">{savedId ? "Saved · Open in My prayers" : "Save to My prayers"}</Text>
      </Pressable>
      {error && <Text className="font-sans text-sm text-danger">{error}</Text>}
    </View>
  );
}
