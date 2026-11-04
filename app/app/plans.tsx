import { router } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Light } from "@/components/Light";
import { PlanRow, Progress, ReminderPicker } from "@/components/PlanParts";
import { ScreenHeader } from "@/components/ScreenHeader";
import { InkButton } from "@/components/ui/Button";
import { CheckIcon, ChevronIcon } from "@/components/ui/icons";
import { useColors } from "@/components/ui/theme";
import { completeDay, endPlan, refreshPlanReminders } from "@/lib/planActions";
import { dayChapters, isChapterRead, nextDay, PLANS, planById, readingMinutes, setPlanReminder, usePlanProgress } from "@/lib/readingPlans";
import { reportError } from "@/lib/errorReporting";

// Reading plans: today's reading of the plan in progress (chapters to open, "Mark as read", the reminder),
// then every plan to choose from. Reached from Home, Discover and the daily reading reminder.

export default function PlansScreen() {
  const insets = useSafeAreaInsets();
  const progress = usePlanProgress();
  const plan = progress ? planById(progress.planId) : undefined;
  const others = PLANS.filter((p) => p.id !== plan?.id);

  return (
    <View className="flex-1 bg-bg">
      <ScreenHeader title="Reading plans" fallback="/today" />
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}>
        {progress && plan ? (
          <Current />
        ) : (
          <View className="mx-4 mt-2 items-center rounded-[28px] bg-card px-6 py-7">
            <Light size={56} />
            <Text className="mt-3 text-center font-display text-[24px] text-ink" style={{ lineHeight: 29, letterSpacing: -0.6 }}>
              Read the Bible, a little every day
            </Text>
            <Text className="mt-2 text-center font-sans text-[15px] leading-6 text-muted">
              Pick a plan and we’ll give you one short reading a day, with a reminder at the time you choose. Miss a day and
              the plan simply waits for you.
            </Text>
          </View>
        )}

        <Text className="mx-4 mt-8 font-display text-[22px] text-ink" style={{ letterSpacing: -0.6 }}>
          {plan ? "Other plans" : "Choose a plan"}
        </Text>
        <View className="mt-2 px-4">
          {others.map((p) => (
            <PlanRow key={p.id} plan={p} onPress={() => router.push({ pathname: "/plans/[id]", params: { id: p.id } })} />
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

// The plan in progress
function Current() {
  const c = useColors();
  const progress = usePlanProgress()!;
  const plan = planById(progress.planId)!;
  const [error, setError] = useState<string | null>(null);
  const [stopping, setStopping] = useState(false);
  const day = nextDay(plan, progress);

  if (day === null) {
    return (
      <View className="mx-4 mt-2 items-center rounded-[28px] bg-gold px-6 py-8">
        <Light size={64} state="speaking" />
        <Text className="mt-3 text-center font-display text-[26px] text-on-pastel" style={{ lineHeight: 31, letterSpacing: -0.8 }}>
          You finished {plan.title.charAt(0).toLowerCase() + plan.title.slice(1)}
        </Text>
        <Text className="mt-2 text-center font-sans text-[15px] leading-6 text-on-pastel/80">
          {plan.days} days of reading. Well done, and thank God for every one of them.
        </Text>
        <Pressable onPress={endPlan} accessibilityRole="button" className="mt-5 rounded-full bg-on-pastel px-5 py-3 active:opacity-80">
          <Text className="font-sans-semibold text-[15px] text-gold">Choose another plan</Text>
        </Pressable>
      </View>
    );
  }

  const chapters = dayChapters(plan, day);
  const firstUnread = chapters.find((ch) => !isChapterRead(progress, ch)) ?? chapters[0];
  const open = (osis: string, chapter: number) => router.push({ pathname: "/bible/[book]/[chapter]", params: { book: osis, chapter: String(chapter) } });

  return (
    <View className="mx-4 mt-2">
      <View className="rounded-[28px] bg-card p-5">
        <Text className="font-sans text-sm text-muted">{plan.title}</Text>
        <View className="mt-1 flex-row items-baseline justify-between">
          <Text className="font-display text-[28px] text-ink" style={{ letterSpacing: -0.8 }}>
            Day {day + 1}
          </Text>
          <Text className="font-sans text-sm text-muted">
            {progress.done.length} of {plan.days} done
          </Text>
        </View>
        <View className="mt-3">
          <Progress value={progress.done.length / plan.days} />
        </View>

        <Text className="mt-5 font-sans text-sm text-muted">Today’s reading · about {readingMinutes(plan, chapters)} min</Text>
        <View className="mt-2 overflow-hidden rounded-2xl bg-bg">
          {chapters.map((ch, i) => {
            const read = isChapterRead(progress, ch);
            return (
              <Pressable
                key={`${ch.osis}.${ch.chapter}`}
                onPress={() => open(ch.osis, ch.chapter)}
                accessibilityRole="button"
                accessibilityLabel={`${ch.book} ${ch.chapter}${read ? ", read" : ""}`}
                className={`flex-row items-center gap-3 px-4 py-3.5 active:opacity-70 ${i > 0 ? "border-t border-line" : ""}`}
              >
                <View className={`h-7 w-7 items-center justify-center rounded-full ${read ? "bg-gold" : "border-[1.5px] border-line2"}`}>
                  {read && <CheckIcon size={14} color={c.onPastel} />}
                </View>
                <Text className="flex-1 font-sans text-base text-ink">
                  {ch.book} {ch.chapter}
                </Text>
                <ChevronIcon size={16} color={c.dim} />
              </Pressable>
            );
          })}
        </View>

        <View className="mt-4 gap-2.5">
          <InkButton label={progress.read.length ? "Keep reading" : "Start reading"} onPress={() => open(firstUnread.osis, firstUnread.chapter)} />
          <Pressable onPress={() => completeDay(day)} accessibilityRole="button" className="h-14 items-center justify-center rounded-full bg-bg active:opacity-80">
            <Text className="font-sans-semibold text-[17px] text-ink">Mark as read</Text>
          </Pressable>
        </View>
      </View>

      <View className="mt-4 rounded-[28px] bg-card p-5">
        <Text className="font-display text-[18px] text-ink">Daily reminder</Text>
        <Text className="mb-3 mt-0.5 font-sans text-sm text-muted">Skipped on days you’ve already read.</Text>
        <ReminderPicker
          onCard
          value={progress.reminder}
          setError={setError}
          onChange={(time) => {
            setPlanReminder(time);
            refreshPlanReminders().catch(reportError);
          }}
        />
        {error && <Text className="mt-3 font-sans text-sm text-danger">{error}</Text>}
      </View>

      <View className="mt-4 items-center">
        {stopping ? (
          <View className="flex-row gap-4">
            <Pressable onPress={endPlan} accessibilityRole="button" hitSlop={8}>
              <Text className="font-sans-semibold text-[15px] text-danger">Yes, stop this plan</Text>
            </Pressable>
            <Pressable onPress={() => setStopping(false)} accessibilityRole="button" hitSlop={8}>
              <Text className="font-sans text-[15px] text-muted">Keep going</Text>
            </Pressable>
          </View>
        ) : (
          <Pressable onPress={() => setStopping(true)} accessibilityRole="button" hitSlop={8}>
            <Text className="font-sans text-[15px] text-muted">Stop this plan</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}
