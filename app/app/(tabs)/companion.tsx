import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Light } from "@/components/Light";
import { InkButton, LineButton } from "@/components/ui/Button";
import { ArrowIcon, PlusIcon } from "@/components/ui/icons";
import { useColors } from "@/components/ui/theme";
import { useAuth } from "@/context/AuthContext";
import { createConversation, getQuota, listConversations } from "@/lib/api/chat";
import { errorMessage } from "@/lib/api/client";
import type { ConversationSummary, Quota } from "@/lib/api/types";
import { reportError } from "@/lib/errorReporting";

// Companion (SPEC §10.2): quick prompts, "New conversation", earlier conversations and today's allowance.

const QUICK_PROMPTS = ["Pray for me", "Explain this verse", "I'm struggling with…", "Give me a verse for…", "Help me forgive"];

function when(iso: string) {
  const d = new Date(iso);
  const days = Math.floor((Date.now() - d.getTime()) / 86_400_000);
  if (days < 1) return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  if (days < 7) return d.toLocaleDateString("en-US", { weekday: "long" });
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function CompanionScreen() {
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

  // Starts a conversation; a quick prompt is put in the input box, ready to finish or send
  const start = async (prompt?: string) => {
    setStarting(true);
    try {
      const id = await createConversation();
      router.push({ pathname: "/companion/[id]", params: { id, ...(prompt && { prompt }) } });
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
      <View className="flex-row items-center justify-between px-5">
        <View className="flex-1">
          <Text className="font-display text-[30px] leading-9 text-ink">Companion</Text>
          <Text className="mt-1 font-sans text-base text-muted">Ask about the Bible, or ask for a prayer.</Text>
        </View>
        <Light size={56} />
      </View>

      <View className="mt-5 px-4">
        <InkButton label="New conversation" onPress={() => start()} loading={starting} icon={<PlusIcon color={c.onPastel} />} />
        {left !== null && (
          <Text className="mt-2.5 text-center font-sans text-sm text-muted">
            {left} of {quota!.limit} messages left today
          </Text>
        )}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 16 }} className="mt-4">
        {QUICK_PROMPTS.map((p) => (
          <Pressable
            key={p}
            onPress={() => start(p)}
            disabled={starting}
            accessibilityRole="button"
            className="rounded-full bg-sage px-4 py-2.5 active:opacity-80"
          >
            <Text className="font-sans-bold text-sm text-on-pastel">{p}</Text>
          </Pressable>
        ))}
      </ScrollView>

      {error && <Text className="mx-5 mt-4 font-sans text-sm text-danger">{error}</Text>}

      {conversations && conversations.length > 0 && (
        <View className="mx-4 mt-6 overflow-hidden rounded-[24px] bg-card">
          <Text className="px-5 pb-1 pt-4 font-sans-bold text-xs uppercase tracking-[2px] text-muted">Earlier</Text>
          {conversations.map((conv, i) => (
            <Pressable
              key={conv.id}
              onPress={() => router.push({ pathname: "/companion/[id]", params: { id: conv.id } })}
              accessibilityRole="button"
              className={`flex-row items-center gap-3 px-5 py-4 active:opacity-70 ${i > 0 ? "border-t border-line" : ""}`}
            >
              <View className="flex-1">
                <Text className="font-sans-bold text-base text-ink" numberOfLines={1}>
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
