import { router, useFocusEffect, type Href } from "expo-router";
import { useCallback, useState, type ReactNode } from "react";
import { Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Light } from "@/components/Light";
import { BookIcon, ChevronIcon, GearIcon } from "@/components/ui/icons";
import { useColors } from "@/components/ui/theme";
import { useAuth } from "@/context/AuthContext";
import { errorMessage } from "@/lib/api/client";
import { getJourney } from "@/lib/api/today";
import type { Journey } from "@/lib/api/types";
import { reportError } from "@/lib/errorReporting";

// Journey (SPEC §10.2): this week against the goal, the last 8 weeks as bars, totals, and the way into the Bible
// and Settings. Saved prayers, intentions and notes join the rows as they're built.

export default function JourneyScreen() {
  const { premium } = useAuth();
  const insets = useSafeAreaInsets();
  const c = useColors();
  const [journey, setJourney] = useState<Journey | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(
    () =>
      getJourney().then(
        (data) => {
          setJourney(data);
          setError(null);
        },
        (err) => {
          reportError(err);
          setError(errorMessage(err));
        },
      ),
    [],
  );

  // Praying on Today changes this week, so reload on every visit
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const thisWeek = journey?.weeks[journey.weeks.length - 1];
  const tallest = Math.max(7, ...(journey?.weeks.map((w) => w.goal) ?? []));

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
        <Text className="font-display text-[30px] leading-9 text-ink">Journey</Text>
        <Pressable
          onPress={() => router.push("/settings")}
          accessibilityRole="button"
          accessibilityLabel="Settings"
          hitSlop={8}
          className="h-11 w-11 items-center justify-center rounded-full bg-card active:opacity-70"
        >
          <GearIcon color={c.ink} />
        </Pressable>
      </View>

      {error && <Text className="mx-5 mt-3 font-sans text-sm text-danger">{error}</Text>}

      {!journey ? (
        !error && (
          <View className="mt-10 items-center">
            <Light size={56} state="thinking" />
          </View>
        )
      ) : (
        <>
          <View className="mx-4 mt-5 rounded-[28px] bg-card px-6 py-5">
            <Text className="font-sans-bold text-xs uppercase tracking-[2px] text-olive-deep">This week</Text>
            <Text className="mt-1.5 font-display text-[26px] leading-8 text-ink">
              {thisWeek!.done} of {thisWeek!.goal} days
            </Text>
            <Text className="mt-1 font-sans text-sm text-muted">
              {thisWeek!.done >= thisWeek!.goal ? "Goal reached. Well done." : "Missed days never reset anything."}
            </Text>

            {/* Last 8 weeks, oldest first; the line marks the goal */}
            <View className="mt-5 h-28 flex-row items-end justify-between">
              {journey.weeks.map((w, i) => {
                const current = i === journey.weeks.length - 1;
                return (
                  <View key={w.start} className="flex-1 items-center gap-1.5">
                    <View className="h-24 w-6 justify-end overflow-hidden rounded-full bg-line">
                      <View
                        className={`w-full rounded-full ${w.done >= w.goal ? "bg-olive" : current ? "bg-olive-deep/60" : "bg-olive/60"}`}
                        style={{ height: `${Math.min(100, (w.done / tallest) * 100)}%` }}
                      />
                    </View>
                    <Text className={`font-sans text-[10px] ${current ? "font-sans-bold text-olive-deep" : "text-muted"}`}>
                      {current ? "Now" : new Date(`${w.start}T12:00:00`).toLocaleDateString("en-US", { month: "numeric", day: "numeric" })}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>

          <View className="mx-4 mt-4 flex-row gap-3">
            <Stat value={journey.totals.daysPrayed} label="days prayed" />
            <Stat value={journey.totals.prayers} label="guided prayers" />
          </View>
        </>
      )}

      <View className="mx-4 mt-4 overflow-hidden rounded-[24px] bg-card">
        <Row href="/bible" icon={<BookIcon size={20} color={c.ink} />} label="Bible" />
        <Row href="/settings" icon={<GearIcon size={20} color={c.ink} />} label="Settings" border />
        {!premium.active && <Row href="/paywall" icon={<Light size={22} />} label="Try Premium free for 7 days" border />}
      </View>
    </ScrollView>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <View className="flex-1 rounded-[24px] bg-card px-5 py-4">
      <Text className="font-display text-[28px] leading-9 text-ink">{value}</Text>
      <Text className="font-sans text-sm text-muted">{label}</Text>
    </View>
  );
}

function Row({ href, icon, label, border }: { href: Href; icon: ReactNode; label: string; border?: boolean }) {
  const c = useColors();
  return (
    <Pressable
      onPress={() => router.push(href)}
      accessibilityRole="button"
      className={`flex-row items-center gap-3.5 px-5 py-4 active:opacity-70 ${border ? "border-t border-line" : ""}`}
    >
      {icon}
      <Text className="flex-1 font-sans-bold text-base text-ink">{label}</Text>
      <ChevronIcon color={c.dim} />
    </Pressable>
  );
}
