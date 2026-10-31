import { router } from "expo-router";
import { Text, View } from "react-native";
import { ArtSheet } from "@/components/ArtSheet";
import { InkButton, LineButton } from "@/components/ui/Button";
import { track } from "@/lib/analytics";
import { APP_NAME } from "@/lib/config";
import { QUIZ } from "@/lib/quiz";

// First screen for people who came from the App Store (Path B). The sun in the dawn scene is the Light.
export default function Welcome() {
  const start = () => {
    track("quiz_started", { funnel_slug: "app" });
    router.push({ pathname: "/quiz/[step]", params: { step: QUIZ[0].id } });
  };

  return (
    <ArtSheet scene="dawn" light="idle" artHeight={440}>
      <Text className="font-sans-bold text-xs uppercase tracking-[2px] text-olive-deep">{APP_NAME}</Text>
      <Text className="mt-2 font-display text-[32px] leading-[38px] text-ink">A daily prayer, made for you.</Text>
      <Text className="mt-3 font-sans text-base leading-6 text-muted">
        Personal prayers and gentle answers, always grounded in real Scripture.
      </Text>

      <View className="mt-auto gap-3 pt-8">
        <InkButton label="Get started" onPress={start} />
        <LineButton label="I already have an account" onPress={() => router.push("/sign-in")} />
        <Text className="mt-1 text-center font-sans text-[13px] text-muted">
          The Bible, verse of the day and a daily prayer are free forever.
        </Text>
      </View>
    </ArtSheet>
  );
}
