import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import { router } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Light } from "@/components/Light";
import { Scene } from "@/components/Scene";
import { LineButton, OliveButton } from "@/components/ui/Button";
import { BookIcon, PauseIcon, PlayIcon } from "@/components/ui/icons";
import { useColors } from "@/components/ui/theme";
import { track } from "@/lib/analytics";
import { errorMessage } from "@/lib/api/client";
import { getFunnelRecording, getSamplePrayer, type FunnelRecording } from "@/lib/api/onboarding";
import type { SamplePrayer as Prayer } from "@/lib/api/types";
import { getPendingOnboarding } from "@/lib/onboarding";

// After sign-in: the first prayer, as on the web funnel. The recorded funnel prayer from the admin library when one
// is published (read aloud, the text following the voice); otherwise a prayer written from the quiz answers.
// "Amen" goes on to the 7-day path.

type First = { recording: FunnelRecording } | { prayer: Prayer };

export default function SamplePrayer() {
  const insets = useSafeAreaInsets();
  const [first, setFirst] = useState<First | null>(null);
  const [error, setError] = useState<string | null>(null);

  // State is only set in the promise callbacks, after the request
  const load = useCallback(() => {
    const started = Date.now();
    return getPendingOnboarding().then(async (pending) => {
      const answers = pending?.answers ?? {};
      const recording = await getFunnelRecording(answers.struggles).catch(() => null);
      if (recording) return setFirst({ recording });
      return getSamplePrayer(answers).then(
        (prayer) => {
          setFirst({ prayer });
          track("sample_prayer_generated", { latency_ms: Date.now() - started });
        },
        (err) => setError(errorMessage(err)),
      );
    });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const amen = () => router.push("/onboarding-path");

  return (
    <View className="flex-1 bg-bg">
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 30 }} bounces={false}>
        <View style={{ height: 330 }}>
          <Scene name={first && "recording" in first ? first.recording.scene : "dawn"} options={{ noSun: true }} />
          <View style={{ position: "absolute", left: 0, right: 0, top: insets.top + 60, alignItems: "center" }}>
            <Light size={110} state={first ? "speaking" : "thinking"} />
          </View>
        </View>

        <View className="mx-4 -mt-[70px] rounded-[28px] bg-card px-6 pb-6 pt-6">
          {first && "recording" in first ? (
            <Recorded recording={first.recording} onAmen={amen} />
          ) : first ? (
            <Written prayer={first.prayer} onAmen={amen} />
          ) : error ? (
            <View className="gap-3">
              <Text className="font-display text-2xl text-ink">We couldn’t load your prayer</Text>
              <Text className="font-sans text-base text-muted">{error}</Text>
              <LineButton
                label="Try again"
                onPress={() => {
                  setError(null);
                  load();
                }}
              />
              <LineButton label="Skip for now" onPress={amen} />
            </View>
          ) : (
            <View className="items-center py-6">
              <Text className="font-display text-2xl text-ink">Finding your first prayer…</Text>
              <Text className="mt-2 text-center font-sans text-base text-muted">Choosing verses for what you’re carrying.</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

// The recording plays on its own; the line being read is bright, the rest fade back
function Recorded({ recording, onAmen }: { recording: FunnelRecording; onAmen: () => void }) {
  const c = useColors();
  const player = useAudioPlayer({ uri: recording.url }, { updateInterval: 250 });
  const status = useAudioPlayerStatus(player);

  useEffect(() => {
    setAudioModeAsync({ playsInSilentMode: true }).catch(() => {});
    player.play();
  }, [player]);

  const at = status.currentTime;
  const duration = status.duration || recording.durationSec || 0;
  let current = -1;
  recording.lines.forEach((l, i) => {
    if (l.t !== null && l.t <= at + 0.2) current = i;
  });
  const started = status.playing || at > 0;

  const toggle = () => {
    if (status.playing) player.pause();
    else {
      if (status.didJustFinish || (duration && at >= duration - 0.3)) player.seekTo(0).catch(() => {});
      player.play();
    }
  };

  return (
    <>
      <Text className="font-sans-bold text-xs uppercase tracking-[2px] text-olive-deep">Your first prayer</Text>
      <Text className="mt-1.5 font-display text-[28px] leading-[34px] text-ink">{recording.title}</Text>

      <View className="mt-4 flex-row items-center gap-4 rounded-3xl bg-bg px-4 py-3">
        <Pressable
          onPress={toggle}
          accessibilityRole="button"
          accessibilityLabel={status.playing ? "Pause" : "Play"}
          className="h-12 w-12 items-center justify-center rounded-full bg-ink active:opacity-80"
        >
          {!status.isLoaded || (status.isBuffering && !status.playing) ? (
            <ActivityIndicator color={c.bg} />
          ) : status.playing ? (
            <PauseIcon size={18} color={c.bg} />
          ) : (
            <PlayIcon size={18} color={c.bg} />
          )}
        </Pressable>
        <View className="flex-1">
          <View className="h-1.5 overflow-hidden rounded-full bg-line">
            <View className="h-full rounded-full bg-ink" style={{ width: `${duration ? Math.min(100, (at / duration) * 100) : 0}%` }} />
          </View>
        </View>
      </View>

      <View className="mb-2 mt-4 gap-3">
        {recording.lines.map((l, i) => (
          <Text key={i} className={`font-serif text-[17px] leading-7 ${!started || current === i ? "text-ink" : "text-muted"}`}>
            {l.text}
          </Text>
        ))}
      </View>

      <View className="mt-5 items-center">
        <OliveButton label="Amen" onPress={onAmen} />
      </View>
    </>
  );
}

function Written({ prayer, onAmen }: { prayer: Prayer; onAmen: () => void }) {
  const c = useColors();
  return (
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
        <OliveButton label="Amen" onPress={onAmen} />
      </View>
    </>
  );
}
