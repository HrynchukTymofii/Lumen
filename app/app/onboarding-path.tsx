import { buildPlan, topicOf } from "@website/funnels/plan";
import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Scene } from "@/components/Scene";
import { InkButton } from "@/components/ui/Button";
import { track } from "@/lib/analytics";
import type { Answers } from "@/lib/api/types";
import { getPendingOnboarding } from "@/lib/onboarding";

// After the first prayer: the 7-day path, built from the quiz answers like the web funnel's (website/funnels/plan.ts).
// It reads like a week: real day names from today, and a small scene per day from sunrise to night. Then the
// paywall, which finishes onboarding however it's closed.

const WEEK_SCENES = ["dawn", "sky", "meadow", "lake", "golden", "dusk", "evening"];

function dayLabel(i: number) {
  if (i === 0) return "Today";
  if (i === 1) return "Tomorrow";
  const d = new Date();
  d.setDate(d.getDate() + i);
  return d.toLocaleDateString("en-US", { weekday: "long" });
}

const REMIND: Record<string, string> = {
  morning: "We'll remind you in the morning.",
  evening: "We'll remind you in the evening.",
  both: "We'll remind you in the morning and evening.",
};

export default function OnboardingPath() {
  const insets = useSafeAreaInsets();
  const [answers, setAnswers] = useState<Answers | null>(null);

  useEffect(() => {
    getPendingOnboarding().then((p) => setAnswers(p?.answers ?? {}));
    track("plan_viewed", { funnel_slug: "app" });
  }, []);

  const plan = useMemo(() => (answers ? buildPlan(answers) : []), [answers]);
  if (!answers) return <View className="flex-1 bg-bg" />;

  return (
    <View className="flex-1 bg-bg">
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 32, paddingHorizontal: 20, paddingBottom: 24 }}>
        <Text className="font-display text-[30px] leading-9 text-ink">
          {answers.firstName ? `${answers.firstName}, your 7-day prayer path is ready` : "Your 7-day prayer path is ready"}
        </Text>
        <Text className="mt-2 font-sans text-base leading-6 text-muted">
          Built around {topicOf(answers)}. A few minutes a day. {REMIND[answers.prayerTime ?? ""] ?? "We'll remind you at the time you pick."}
        </Text>

        <View className="mt-6 gap-2.5">
          {plan.map((d, i) => (
            <View
              key={d.day}
              className={`flex-row items-center gap-3.5 rounded-[22px] border-[1.5px] bg-card p-2 pr-4 ${i === 0 ? "border-ink" : "border-line"}`}
            >
              <View className="h-14 w-14 overflow-hidden rounded-2xl">
                <Scene name={WEEK_SCENES[i % WEEK_SCENES.length]} options={{ seed: i, noBigTrees: true }} />
              </View>
              <View className="flex-1">
                <Text className={`font-sans-bold text-xs uppercase tracking-[1.5px] ${i === 0 ? "text-olive-deep" : "text-muted"}`}>{dayLabel(i)}</Text>
                <Text className="mt-0.5 font-sans-bold text-base text-ink">{i === 0 ? "Your first prayer" : d.title}</Text>
                <Text className="font-sans text-sm text-muted">{i === 0 ? "The prayer written for you" : d.focus}</Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      <View className="border-t border-line px-6 pt-4" style={{ paddingBottom: insets.bottom + 8 }}>
        <InkButton label="Continue" onPress={() => router.push({ pathname: "/paywall", params: { placement: "onboarding" } })} />
      </View>
    </View>
  );
}
