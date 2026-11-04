import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ReminderPicker } from "@/components/PlanParts";
import { Scene } from "@/components/Scene";
import { ScreenHeader } from "@/components/ScreenHeader";
import { InkButton } from "@/components/ui/Button";
import { beginPlan } from "@/lib/planActions";
import { dayChapters, nextDay, planById, readingLabel, readingMinutes, usePlanProgress } from "@/lib/readingPlans";

// One reading plan before starting it: what it is, the first days' readings, a reminder time, "Start plan".

export default function PlanScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const plan = planById(id);
  const current = usePlanProgress();
  const [reminder, setReminder] = useState<string | null>("07:00");
  const [error, setError] = useState<string | null>(null);

  if (!plan) {
    return (
      <View className="flex-1 bg-bg">
        <ScreenHeader title="Reading plan" fallback="/plans" />
        <Text className="mx-6 mt-6 font-sans text-base text-muted">This plan isn’t available.</Text>
      </View>
    );
  }

  const currentPlan = current ? planById(current.planId) : undefined;
  const currentDay = current && currentPlan ? nextDay(currentPlan, current) : null;
  const typical = dayChapters(plan, 0);

  return (
    <View className="flex-1 bg-bg">
      <ScreenHeader title="" fallback="/plans" />
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}>
        <View className="mx-4 h-[180px] overflow-hidden rounded-[28px] bg-card">
          <Scene name={plan.scene} options={{ seed: plan.days }} />
        </View>

        <View className="px-5">
          <Text className="mt-5 font-display text-[30px] text-ink" style={{ lineHeight: 35, letterSpacing: -1 }}>
            {plan.title}
          </Text>
          <Text className="mt-1 font-sans text-[15px] text-muted">
            {plan.days} days · about {readingMinutes(plan, typical)} min a day
          </Text>
          <Text className="mt-4 font-sans text-base leading-6 text-ink">{plan.description}</Text>

          <Text className="mt-6 font-sans text-sm text-muted">The first days</Text>
          <View className="mt-2 overflow-hidden rounded-2xl bg-card">
            {[0, 1, 2].map((d) => (
              <View key={d} className={`flex-row gap-3 px-4 py-3.5 ${d > 0 ? "border-t border-line" : ""}`}>
                <Text className="w-14 font-sans text-[15px] text-muted">Day {d + 1}</Text>
                <Text className="flex-1 font-sans text-[15px] text-ink">{readingLabel(dayChapters(plan, d))}</Text>
              </View>
            ))}
          </View>

          <Text className="mt-6 font-display text-[18px] text-ink">Remind me every day</Text>
          <Text className="mb-3 mt-0.5 font-sans text-sm text-muted">Skipped on days you’ve already read.</Text>
          <ReminderPicker value={reminder} onChange={setReminder} setError={setError} />
          {error && <Text className="mt-3 font-sans text-sm text-danger">{error}</Text>}

          {currentPlan && currentPlan.id !== plan.id && (
            <Text className="mt-6 font-sans text-sm leading-5 text-muted">
              This replaces {currentPlan.title.charAt(0).toLowerCase() + currentPlan.title.slice(1)}
              {currentDay !== null ? `, where you’re on day ${currentDay + 1}` : ""}.
            </Text>
          )}

          <View className="mt-4">
            <InkButton
              label={currentPlan?.id === plan.id ? "Continue this plan" : "Start plan"}
              onPress={() => {
                if (currentPlan?.id !== plan.id) beginPlan(plan.id, reminder);
                router.replace("/plans");
              }}
            />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
