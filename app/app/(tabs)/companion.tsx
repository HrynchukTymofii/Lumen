import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Light } from "@/components/Light";
import { InkButton, LineButton } from "@/components/ui/Button";
import { ArrowIcon, PlusIcon } from "@/components/ui/icons";
import { useColors } from "@/components/ui/theme";
import { useAuth } from "@/context/AuthContext";
import { askToSignIn } from "@/lib/account";
import { companionTopic } from "@/lib/companionTopics";
import { createConversation, getQuota, listConversations } from "@/lib/api/chat";
import { errorMessage } from "@/lib/api/client";
import type { ConversationSummary, Quota } from "@/lib/api/types";
import { reportError } from "@/lib/errorReporting";

// Companion (SPEC §10.2): what the companion can do (said for what they're carrying, lib/companionTopics.ts),
// suggestions to start with, "New conversation", earlier conversations and today's allowance.

function when(iso: string) {
  const d = new Date(iso);
  const days = Math.floor((Date.now() - d.getTime()) / 86_400_000);
  if (days < 1) return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  if (days < 7) return d.toLocaleDateString("en-US", { weekday: "long" });
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function CompanionScreen() {
  const { user } = useAuth();
  // Conversations are kept on the account
  if (!user) return <CompanionIntro />;
  return <Companion />;
}

// Without an account: what the companion is, and the way to start
function CompanionIntro() {
  const insets = useSafeAreaInsets();
  return (
    <ScrollView className="flex-1 bg-bg" contentContainerStyle={{ flexGrow: 1, paddingTop: insets.top + 16, paddingBottom: 32, paddingHorizontal: 24 }}>
      <Text className="font-display text-[30px] leading-9 text-ink">Companion</Text>
      <View className="flex-1 items-center justify-center py-10">
        <Light size={110} />
        <Text className="mt-6 text-center font-display text-2xl leading-8 text-ink">Ask anything about the Bible</Text>
        <Text className="mt-2 text-center font-sans text-base leading-6 text-muted">
          Questions on faith, a prayer for what you’re carrying, or just someone to talk things through with. Every
          answer quotes real verses.
        </Text>
        <View className="mt-7 w-full">
          <InkButton label="Create a free account" onPress={() => askToSignIn("companion")} />
        </View>
      </View>
      <Text className="text-center font-sans text-xs leading-5 text-dim">
        The companion is an AI. It can make mistakes and isn’t a pastor, counselor or doctor.
      </Text>
    </ScrollView>
  );
}

function Companion() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const c = useColors();
  const [conversations, setConversations] = useState<ConversationSummary[] | null>(null);
  const [quota, setQuota] = useState<Quota | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [starting, setStarting] = useState(false);

  const load = useCallback(
    () =>
      Promise.all([listConversations(), getQuota()]).then(
        ([list, q]) => {
          // A conversation gets its title from the first message; ones left empty are hidden
          setConversations(list.filter((conv) => conv.title));
          setQuota(q);
          setError(null);
        },
        (err) => {
          reportError(err);
          setError(errorMessage(err));
        },
      ),
    [],
  );

  // Coming back from a chat shows its new title and the updated allowance
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  // Starts a conversation. A finished suggestion is sent straight away; one ending in "…" is put in the input box to finish.
  const start = async (prompt?: string) => {
    if (starting) return;
    setStarting(true);
    try {
      const id = await createConversation();
      const send = prompt && !prompt.endsWith("…") ? { send: "1" } : {};
      router.push({ pathname: "/companion/[id]", params: { id, ...(prompt && { prompt }), ...send } });
    } catch (err) {
      reportError(err);
      setError(errorMessage(err));
    } finally {
      setStarting(false);
    }
  };

  if (user && !user.aiEnabled) {
    return (
      <View className="flex-1 items-center justify-center bg-bg px-8" style={{ paddingTop: insets.top }}>
        <Light size={80} />
        <Text className="mt-5 text-center font-display text-2xl text-ink">The companion is turned off</Text>
        <Text className="mt-2 text-center font-sans text-base leading-6 text-muted">You can turn it back on in Settings.</Text>
        <View className="mt-6 w-full">
          <LineButton label="Open Settings" onPress={() => router.navigate("/settings")} />
        </View>
      </View>
    );
  }

  const left = quota && !quota.premium ? Math.max(0, quota.limit - quota.used) : null;
  const topic = companionTopic(user);

  return (
    <ScrollView
      className="flex-1 bg-bg"
      contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: 32 }}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          tintColor={c.muted}
          onRefresh={() => {
            setRefreshing(true);
            load().finally(() => setRefreshing(false));
          }}
        />
      }
    >
      <Text className="px-4 font-display text-[32px] text-ink" style={{ lineHeight: 38, letterSpacing: -1.1 }}>
        Companion
      </Text>

      {/* What the companion can do, for what they told us they're carrying */}
      <View className="mx-4 mt-4 rounded-[28px] bg-card p-5">
        <View className="flex-row items-center gap-3">
          <Light size={44} state={starting ? "thinking" : "idle"} />
          <Text className="flex-1 font-display text-[20px] leading-6 text-ink">{topic.hint}</Text>
        </View>
        <Text className="mt-3 font-sans text-[15px] leading-6 text-muted">{topic.invite}</Text>
        <Text className="mt-4 font-sans text-sm text-muted">Try one of these</Text>
        <View className="mt-2 gap-2">
          {topic.prompts.map((p) => (
            <Pressable
              key={p}
              onPress={() => start(p)}
              disabled={starting}
              accessibilityRole="button"
              className="flex-row items-center justify-between rounded-2xl bg-bg px-4 py-3.5 active:opacity-75"
            >
              <Text className="flex-1 font-sans text-[15px] text-ink">{p}</Text>
              <ArrowIcon size={16} color={c.muted} />
            </Pressable>
          ))}
        </View>
      </View>

      <View className="mt-4 px-4">
        <InkButton label="New conversation" onPress={() => start()} loading={starting} icon={<PlusIcon color={c.bg} />} />
        {left !== null && (
          <Text className="mt-2.5 text-center font-sans text-sm text-muted">
            {left} of {quota!.limit} messages left today
          </Text>
        )}
      </View>

      {error && <Text className="mx-5 mt-4 font-sans text-sm text-danger">{error}</Text>}

      {conversations && conversations.length > 0 && (
        <View className="mx-4 mt-6 overflow-hidden rounded-[24px] bg-card">
          <Text className="px-5 pb-1 pt-4 font-sans text-sm text-muted">Earlier conversations</Text>
          {conversations.map((conv, i) => (
            <Pressable
              key={conv.id}
              onPress={() => router.push({ pathname: "/companion/[id]", params: { id: conv.id } })}
              accessibilityRole="button"
              className={`flex-row items-center gap-3 px-5 py-4 active:opacity-70 ${i > 0 ? "border-t border-line" : ""}`}
            >
              <View className="flex-1">
                <Text className="font-sans-semibold text-base text-ink" numberOfLines={1}>
                  {conv.title ?? "New conversation"}
                </Text>
                <Text className="mt-0.5 font-sans text-sm text-muted">{when(conv.updatedAt)}</Text>
              </View>
              <ArrowIcon size={18} color={c.dim} />
            </Pressable>
          ))}
        </View>
      )}

      <Text className="mx-6 mt-6 text-center font-sans text-xs leading-5 text-dim">
        The companion is an AI. It can make mistakes and isn’t a pastor, counselor or doctor.
      </Text>
    </ScrollView>
  );
}
