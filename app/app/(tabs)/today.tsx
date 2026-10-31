import { router } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Light } from "@/components/Light";
import { Scene } from "@/components/Scene";
import { StreakWeek } from "@/components/StreakWeek";
import { LineButton, OliveButton } from "@/components/ui/Button";
import { ArrowIcon, BookIcon, CheckIcon } from "@/components/ui/icons";
import { useColors } from "@/components/ui/theme";
import { useAuth } from "@/context/AuthContext";
import { errorMessage } from "@/lib/api/client";
import { applyGrace, getToday, markPrayed } from "@/lib/api/today";
import type { Streak, Today } from "@/lib/api/types";
import { reportError } from "@/lib/errorReporting";
import { requestPermission, scheduleReminders } from "@/lib/notifications";

// Today (SPEC §10.2): greeting, today's prayer, Mark as prayed + the soft streak, verse of the day, a way into the
// companion. Loading it also re-schedules the daily reminders (lib/notifications.ts).

const DEFAULT_REMINDER = "07:30";

function greeting(hour: number) {
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export default function TodayScreen() {
  const { user, updateProfile } = useAuth();
  const insets = useSafeAreaInsets();
  const c = useColors();
  const [today, setToday] = useState<Today | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [marking, setMarking] = useState(false);
  const [celebrating, setCelebrating] = useState(false);

  const load = useCallback(
    () =>
      getToday().then(
        (data) => {
          setToday(data);
          setError(null);
        },
        (err) => {
          reportError(err);
          setError(errorMessage(err));
        },
      ),
    [],
  );

  useEffect(() => {
    load();
  }, [load]);

  // Keeps the next week of reminders scheduled, without today's once it's prayed
  const prayedToday = today?.streak.prayedToday;
  useEffect(() => {
    if (!user || prayedToday === undefined) return;
    scheduleReminders({ time: user.reminderTime, enabled: user.remindersEnabled, prayedToday, name: user.firstName }).catch(reportError);
  }, [user, prayedToday]);

  const setStreak = (streak: Streak) => setToday((t) => (t ? { ...t, streak } : t));

  const pray = async () => {
    setMarking(true);
    try {
      setStreak(await markPrayed());
      setCelebrating(true);
      setTimeout(() => setCelebrating(false), 2500);
    } catch (err) {
      reportError(err);
      setError(errorMessage(err));
    } finally {
      setMarking(false);
    }
  };

  const grace = async () => {
    try {
      setStreak(await applyGrace());
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  const turnOnReminders = async () => {
    if (!(await requestPermission())) {
      setError("Notifications are off for Lumen. You can allow them in your phone’s settings.");
      return;
    }
    updateProfile({ reminderTime: DEFAULT_REMINDER, remindersEnabled: true }).catch((err) => setError(errorMessage(err)));
  };

  const now = new Date();
  const evening = now.getHours() >= 17;
  const streak = today?.streak;

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
          <Text className="font-display text-[30px] leading-9 text-ink">
            {greeting(now.getHours())}
            {user?.firstName ? `, ${user.firstName}` : ""}
          </Text>
          <Text className="mt-1 font-sans text-base text-muted">
            {now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
          </Text>
        </View>
        <Light size={56} state={celebrating ? "speaking" : today ? "idle" : "thinking"} />
      </View>

      {error && <Text className="mx-5 mt-3 font-sans text-sm text-danger">{error}</Text>}

      {/* Today's prayer on a scene, like the sample prayer */}
      <View className="mx-4 mt-5 overflow-hidden rounded-[28px] bg-card">
        <View style={{ height: 150 }}>
          <Scene name={evening ? "evening" : "dawn"} />
        </View>
        <View className="px-6 pb-6 pt-5">
          <Text className="font-sans-bold text-xs uppercase tracking-[2px] text-olive-deep">Today’s prayer</Text>
          {today ? (
            <>
              <Text className="mt-1.5 font-display text-[26px] leading-8 text-ink">{today.prayer.title}</Text>
              <Text className="mt-3 font-serif text-[17px] leading-7 text-ink">{today.prayer.text}</Text>
              <View className="mt-5 items-center">
                {today.streak.prayedToday ? (
                  <View className="flex-row items-center gap-2 rounded-full bg-sage px-5 py-3">
                    <CheckIcon size={16} color={c.onPastel} />
                    <Text className="font-sans-bold text-base text-on-pastel">Prayed today</Text>
                  </View>
                ) : (
                  <OliveButton label="Mark as prayed" onPress={pray} loading={marking} />
                )}
              </View>
            </>
          ) : !error ? (
            <Text className="mt-2 font-sans text-base text-muted">Getting today’s prayer…</Text>
          ) : (
            <View className="mt-3">
              <LineButton label="Try again" onPress={load} />
            </View>
          )}
        </View>
      </View>

      {streak && !streak.hidden && (
        <View className="mx-4 mt-4 rounded-[28px] bg-card px-6 py-5">
          <StreakWeek streak={streak} />
          {/* Only for someone already praying this week, so a brand-new account isn't offered a grace day */}
          {streak.graceAvailable && streak.doneThisWeek.some(Boolean) && (
            <Pressable onPress={grace} accessibilityRole="button" className="mt-4 active:opacity-70">
              <Text className="font-sans text-sm leading-5 text-muted">
                Missed yesterday? <Text className="font-sans-bold text-olive-deep">Use this week’s grace day</Text>
              </Text>
            </Pressable>
          )}
        </View>
      )}

      {user && !user.reminderTime && (
        <View className="mx-4 mt-4 rounded-[28px] bg-sky px-6 py-5">
          <Text className="font-display text-[20px] leading-7 text-on-pastel">Want a gentle daily reminder?</Text>
          <Text className="mt-1 font-sans text-[15px] leading-6 text-on-pastel/80">
            One a day at {DEFAULT_REMINDER}, skipped once you’ve prayed. Change the time in Settings.
          </Text>
          <Pressable onPress={turnOnReminders} accessibilityRole="button" className="mt-3 self-start rounded-full bg-ink px-5 py-2.5 active:opacity-80">
            <Text className="font-sans-bold text-sm text-bg">Remind me</Text>
          </Pressable>
        </View>
      )}

      {today && (
        <Pressable
          onPress={() => router.push("/bible")}
          accessibilityRole="button"
          className="mx-4 mt-4 rounded-[28px] bg-butter px-6 py-5 active:opacity-90"
        >
          <Text className="font-sans-bold text-xs uppercase tracking-[2px] text-on-pastel/70">Verse of the day</Text>
          <Text className="mt-2 font-serif text-[19px] leading-8 text-on-pastel">“{today.verse.text}”</Text>
          <View className="mt-3 flex-row items-center gap-2">
            <BookIcon size={15} color={c.onPastel} />
            <Text className="font-sans-bold text-sm text-on-pastel">
              {today.verse.ref} · {today.verse.translation}
            </Text>
          </View>
        </Pressable>
      )}

      <Pressable
        onPress={() => router.navigate("/companion")}
        accessibilityRole="button"
        className="mx-4 mt-4 flex-row items-center gap-4 rounded-[28px] bg-lav px-6 py-5 active:opacity-80"
      >
        <View className="flex-1">
          <Text className="font-sans-bold text-xs uppercase tracking-[2px] text-on-pastel/70">Companion</Text>
          <Text className="mt-1 font-display text-[21px] leading-7 text-on-pastel">Talk it through, with real verses</Text>
          <Text className="mt-1 font-sans text-[15px] leading-6 text-on-pastel/80">Ask about a passage or ask for a prayer.</Text>
        </View>
        <View className="h-11 w-11 items-center justify-center rounded-full bg-ink">
          <ArrowIcon color={c.bg} />
        </View>
      </Pressable>
    </ScrollView>
  );
}
