import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Light } from "@/components/Light";
import { ScreenHeader } from "@/components/ScreenHeader";
import { InkButton } from "@/components/ui/Button";
import { ChatIcon, ChevronIcon, PlayIcon, PlusIcon, SparkleIcon } from "@/components/ui/icons";
import { useColors } from "@/components/ui/theme";
import { getAllowance, listPrayers, prayerError, type Allowance, type PersonalPrayerSummary } from "@/lib/api/prayers";
import { reportError } from "@/lib/errorReporting";

// My prayers: every personal prayer, newest first: written by the generator, saved from the companion, or edited.

export default function MyPrayersScreen() {
  const insets = useSafeAreaInsets();
  const c = useColors();
  const [prayers, setPrayers] = useState<PersonalPrayerSummary[] | null>(null);
  const [allowance, setAllowance] = useState<Allowance | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(
    () =>
      Promise.all([
        listPrayers().then(setPrayers, (err) => setError(prayerError(err).message)),
        getAllowance().then(setAllowance, reportError),
      ]),
    [],
  );
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  return (
    <View className="flex-1 bg-bg">
      <ScreenHeader
        title="My prayers"
        fallback="/me"
        right={
          <Pressable onPress={() => router.push("/personal-prayer/new")} accessibilityRole="button" accessibilityLabel="Write a new prayer" hitSlop={10}>
            <PlusIcon size={22} color={c.ink} />
          </Pressable>
        }
      />
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 32 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true);
              await load();
              setRefreshing(false);
            }}
          />
        }
      >
        {allowance && (allowance.premium || allowance.tokens > 0) && (
          <Pressable
            onPress={() => router.push("/personal-prayer/tokens")}
            accessibilityRole="button"
            className="mb-4 flex-row items-center justify-between rounded-2xl bg-card px-4 py-3 active:opacity-80"
          >
            <Text className="flex-1 font-sans text-[15px] text-ink">
              {allowance.tokens} prayer {allowance.tokens === 1 ? "token" : "tokens"}
              {allowance.freeAudioLeft ? " · 1 free audio prayer this month" : ""}
            </Text>
            <ChevronIcon size={16} color={c.dim} />
          </Pressable>
        )}

        {!prayers ? (
          <View className="mt-10 items-center">{error ? <Text className="font-sans text-base text-muted">{error}</Text> : <Light size={56} state="thinking" />}</View>
        ) : !prayers.length ? (
          <View className="mt-10 items-center px-4">
            <Light size={64} />
            <Text className="mt-4 text-center font-display text-2xl text-ink">Prayers for your life</Text>
            <Text className="mt-2 text-center font-sans text-base leading-6 text-muted">
              Tell us what you’re carrying and we’ll write a prayer for it. Prayers you save from the companion show up here too.
            </Text>
            <View className="mt-6 w-full">
              <InkButton label="Write my prayer" onPress={() => router.push("/personal-prayer/new")} />
            </View>
          </View>
        ) : (
          <View className="gap-2">
            {prayers.map((p) => (
              <Pressable
                key={p.id}
                onPress={() => router.push({ pathname: "/personal-prayer/[id]", params: { id: p.id } })}
                accessibilityRole="button"
                className="flex-row items-center gap-3 rounded-3xl bg-card px-4 py-4 active:opacity-80"
              >
                <View className="h-10 w-10 items-center justify-center rounded-full bg-bg">
                  {p.hasAudio ? <PlayIcon size={16} color={c.ink} /> : p.source === "companion" ? <ChatIcon size={18} color={c.ink} /> : <SparkleIcon size={18} color={c.ink} />}
                </View>
                <View className="flex-1">
                  <Text className="font-sans-bold text-base text-ink" numberOfLines={1}>
                    {p.title}
                  </Text>
                  <Text className="font-sans text-sm text-muted">
                    {new Date(p.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })} · {p.words} words
                    {p.hasAudio ? " · audio" : ""}
                  </Text>
                </View>
                <ChevronIcon size={16} color={c.dim} />
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
