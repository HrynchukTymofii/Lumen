import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { OptionCard } from "@/components/OptionCard";
import { IconButton, InkButton } from "@/components/ui/Button";
import { BackIcon } from "@/components/ui/icons";
import { useColors } from "@/components/ui/theme";
import { track } from "@/lib/analytics";
import { getPendingOnboarding, savePendingOnboarding } from "@/lib/onboarding";
import { QUIZ, quizValue } from "@/lib/quiz";

// One quiz question per screen (/quiz/carrying, /quiz/tradition…). Answers wait on the phone until sign-in.
export default function QuizStep() {
  const { step: stepId } = useLocalSearchParams<{ step: string }>();
  const index = Math.max(0, QUIZ.findIndex((s) => s.id === stepId));
  const step = QUIZ[index];
  const c = useColors();
  const [picked, setPicked] = useState<string[]>([]);

  // Coming back to a step shows what was picked before
  useEffect(() => {
    getPendingOnboarding().then((p) => setPicked(p ? quizValue(p.answers, step) : []));
  }, [step]);

  const toggle = (value: string) => {
    if (!step.multi) return setPicked([value]);
    setPicked((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : prev.length < step.multi! ? [...prev, value] : prev,
    );
  };

  const next = async () => {
    await savePendingOnboarding({ answers: { [step.answerKey]: step.multi ? picked : picked[0] } });
    track("quiz_step_completed", { funnel_slug: "app", step_id: step.id, answer: step.sensitive ? "hidden" : picked });
    const following = QUIZ[index + 1];
    if (following) router.push({ pathname: "/quiz/[step]", params: { step: following.id } });
    else router.push("/sign-in");
  };

  return (
    <SafeAreaView className="flex-1 bg-bg">
      <View className="flex-row items-center gap-3 px-6 pt-2">
        <IconButton onPress={() => router.back()} label="Back">
          <BackIcon size={18} color={c.ink} />
        </IconButton>
        <View className="flex-1 flex-row gap-1.5">
          {QUIZ.map((s, i) => (
            <View key={s.id} className={`h-1.5 flex-1 rounded-full ${i <= index ? "bg-olive-deep" : "bg-line2"}`} />
          ))}
        </View>
      </View>

      <ScrollView contentContainerClassName="px-6 pb-6">
        <Text className="mt-6 font-display text-[28px] leading-[34px] text-ink">{step.title}</Text>
        <Text className="mt-2 font-sans text-[15px] leading-[22px] text-muted">{step.subtitle}</Text>

        <View className="mt-6 gap-2.5">
          {step.options.map((o, i) => (
            <OptionCard
              key={o.value}
              label={o.label}
              hint={o.hint}
              scene={step.scenes[o.value] ?? "dawn"}
              seed={i}
              selected={picked.includes(o.value)}
              onPress={() => toggle(o.value)}
            />
          ))}
        </View>
      </ScrollView>

      <View className="border-t border-line px-6 pb-2 pt-4">
        <InkButton label="Continue" onPress={next} disabled={picked.length === 0} />
      </View>
    </SafeAreaView>
  );
}
