import { useCallback, useEffect, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Light } from "@/components/Light";
import { Scene } from "@/components/Scene";
import { LineButton, OliveButton } from "@/components/ui/Button";
import { BookIcon } from "@/components/ui/icons";
import { useColors } from "@/components/ui/theme";
import { useAuth } from "@/context/AuthContext";
import { track } from "@/lib/analytics";
import { errorMessage } from "@/lib/api/client";
import { getSamplePrayer } from "@/lib/api/onboarding";
import type { SamplePrayer as Prayer } from "@/lib/api/types";
import { reportError } from "@/lib/errorReporting";
import { getPendingOnboarding } from "@/lib/onboarding";

// Last onboarding step: the first prayer, written from the quiz answers (the web funnel's sample prayer).
// "Amen" saves the answers to the account and opens the app.
export default function SamplePrayer() {
  const { finishOnboarding } = useAuth();
  const insets = useSafeAreaInsets();
  const c = useColors();
  const [prayer, setPrayer] = useState<Prayer | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [finishing, setFinishing] = useState(false);

  // State is only set in the promise callbacks, after the request
  const load = useCallback(() => {
    const started = Date.now();
    return getPendingOnboarding()
      .then((pending) => getSamplePrayer(pending?.answers ?? {}))
      .then(
        (result) => {
          setPrayer(result);
          track("sample_prayer_generated", { latency_ms: Date.now() - started });
        },
        (err) => setError(errorMessage(err)),
      );
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const finish = async () => {
    setFinishing(true);
    setError(null);
    try {
      // Flips the route guard to the app
      await finishOnboarding();
      track("onboarding_completed", { path: "app_store" });
    } catch (err) {
      reportError(err);
      setError(errorMessage(err));
      setFinishing(false);
    }
  };

  return (
    <View className="flex-1 bg-bg">
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 30 }} bounces={false}>
        <View style={{ height: 330 }}>
          <Scene name="dawn" options={{ noSun: true }} />
          <View style={{ position: "absolute", left: 0, right: 0, top: insets.top + 60, alignItems: "center" }}>
            <Light size={110} state={prayer ? "speaking" : "thinking"} />
          </View>
        </View>

        <View className="mx-4 -mt-[70px] rounded-[28px] bg-card px-6 pb-6 pt-6">
          {prayer ? (
            <>
              <Text className="font-sans-bold text-xs uppercase tracking-[2px] text-olive-deep">Written for you just now</Text>
              <Text className="mt-1.5 font-display text-[28px] leading-[34px] text-ink">{prayer.title}</Text>
              <Text className="mb-4 mt-3 font-serif text-[17px] leading-7 text-ink">{prayer.text}</Text>

              {prayer.citations.map((v) => (
                <View key={v.ref} className="mb-2 rounded-2xl border-[1.5px] border-olive-deep/40 px-4 py-3">
                  <View className="flex-row items-center gap-2">
                    <BookIcon size={15} color={c.oliveDeep} />
                    <Text className="font-sans-bold text-sm text-olive-deep">{v.ref}</Text>
                  </View>
                  <Text className="mt-1 font-serif text-[15px] leading-6 text-muted">{v.text}</Text>
                </View>
              ))}

              <View className="mt-5 items-center">
                <OliveButton label="Amen" onPress={finish} loading={finishing} />
              </View>
            </>
          ) : error ? (
            <View className="gap-3">
              <Text className="font-display text-2xl text-ink">We couldn’t write your prayer</Text>
              <Text className="font-sans text-base text-muted">{error}</Text>
              <LineButton
                label="Try again"
                onPress={() => {
                  setError(null);
                  load();
                }}
              />
              <LineButton label="Skip for now" onPress={finish} loading={finishing} />
            </View>
          ) : (
            <View className="items-center py-6">
              <Text className="font-display text-2xl text-ink">Writing your first prayer…</Text>
              <Text className="mt-2 text-center font-sans text-base text-muted">Choosing verses for what you’re carrying.</Text>
            </View>
          )}
          {prayer && error && <Text className="mt-3 text-center font-sans text-sm text-danger">{error}</Text>}
        </View>
      </ScrollView>
    </View>
  );
}
