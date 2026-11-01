import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Light } from "@/components/Light";
import { TrackArt } from "@/components/TrackArt";
import { IconButton } from "@/components/ui/Button";
import { CheckIcon, CloseIcon, PauseIcon, PlayIcon, SkipIcon } from "@/components/ui/icons";
import { useColors } from "@/components/ui/theme";
import { cachedLibrary } from "@/lib/api/library";
import { markPrayed } from "@/lib/api/today";
import { reportError } from "@/lib/errorReporting";
import { localAudio, recordPlayed } from "@/lib/userLibrary";

// Guided player (SPEC §10.2): full-bleed scene, the Light speaking, the current line on a panel, progress,
// back / play-pause / forward 15 s. Keeps playing with the screen locked. Finishing counts as "prayed" for the week.
// Opened from the prayer screen with ?minutes= for the chosen length; it only gets there for unlocked tracks.

const SKIP = 15;

function clock(seconds: number) {
  const s = Math.max(0, Math.floor(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export default function PlayerScreen() {
  const { slug, minutes } = useLocalSearchParams<{ slug: string; minutes?: string }>();
  const insets = useSafeAreaInsets();
  const c = useColors();
  const track = cachedLibrary()?.tracks.find((t) => t.slug === slug);
  const variant = track?.variants.find((v) => v.minutes === Number(minutes)) ?? track?.variants.find((v) => v.url);

  // A downloaded copy plays without a connection
  const source = variant?.url ? (localAudio(track!.id, variant.minutes) ?? variant.url) : null;
  const player = useAudioPlayer(source, { updateInterval: 250 });
  const status = useAudioPlayerStatus(player);
  const [finished, setFinished] = useState(false);
  const counted = useRef(false);

  // Plays in silent mode and with the screen locked (lock screen controls need doNotMix)
  useEffect(() => {
    setAudioModeAsync({ playsInSilentMode: true, shouldPlayInBackground: true, interruptionMode: "doNotMix" }).catch(reportError);
    if (track) player.setActiveForLockScreen(true, { title: track.title, artist: "Lumen" });
    player.play();
    if (track) recordPlayed(track.id);
    return () => player.setActiveForLockScreen(false);
  }, [player, track]);

  useEffect(() => {
    if (!status.didJustFinish || counted.current) return;
    counted.current = true;
    setFinished(true);
    markPrayed(track?.id).catch(reportError);
  }, [status.didJustFinish, track?.id]);

  const close = () => (router.canGoBack() ? router.back() : router.replace("/discover"));

  if (!track || !variant?.url) {
    // Opened directly without the catalog in memory, or a locked track: back to the prayer screen
    return (
      <View className="flex-1 items-center justify-center bg-bg px-8">
        <Text className="text-center font-sans text-base text-muted">This prayer can’t be played right now.</Text>
        <Pressable onPress={close} accessibilityRole="button" className="mt-4">
          <Text className="font-sans-bold text-base text-olive-deep">Go back</Text>
        </Pressable>
      </View>
    );
  }

  const duration = status.duration || variant.durationSec || 0;
  const time = status.currentTime;
  // The line being spoken: the last one whose timestamp has passed (lines without timestamps: the first)
  const timed = variant.lines.filter((l) => l.t !== null);
  const current = timed.length ? ([...timed].reverse().find((l) => l.t! <= time + 0.2) ?? timed[0]) : variant.lines[0];
  const progress = duration ? Math.min(1, time / duration) : 0;

  return (
    <View className="flex-1 bg-ink">
      <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}>
        <TrackArt imageUrl={track.imageUrl} scene={track.scene} />
      </View>

      <View className="flex-row items-center justify-between px-4" style={{ paddingTop: insets.top + 8 }}>
        <IconButton label="Close" onPress={close}>
          <CloseIcon color={c.ink} />
        </IconButton>
        <Text className="font-sans-bold text-sm text-white/90">{variant.minutes} min</Text>
        <View className="w-10" />
      </View>

      <View className="flex-1 items-center justify-center">
        <Light size={130} state={status.playing ? "speaking" : "idle"} />
      </View>

      <View className="mx-4 rounded-[28px] bg-card/90 px-6 pb-6 pt-5" style={{ marginBottom: insets.bottom + 16 }}>
        <Text className="font-sans-bold text-xs uppercase tracking-[2px] text-olive-deep">{track.title}</Text>
        <Text className="mt-3 min-h-[84px] font-serif text-[19px] leading-8 text-ink">
          {finished ? "Amen." : (current?.text ?? "")}
        </Text>

        <View className="mt-4 h-1.5 overflow-hidden rounded-full bg-line">
          <View className="h-full rounded-full bg-olive-deep" style={{ width: `${progress * 100}%` }} />
        </View>
        <View className="mt-1.5 flex-row justify-between">
          <Text className="font-sans text-xs text-muted">{clock(time)}</Text>
          <Text className="font-sans text-xs text-muted">{clock(duration)}</Text>
        </View>

        <View className="mt-3 flex-row items-center justify-center gap-8">
          <Pressable onPress={() => player.seekTo(Math.max(0, time - SKIP))} accessibilityRole="button" accessibilityLabel="Back 15 seconds" hitSlop={8}>
            <SkipIcon color={c.ink} />
          </Pressable>
          <Pressable
            onPress={() => {
              if (status.playing) return player.pause();
              if (finished) {
                setFinished(false);
                player.seekTo(0);
              }
              player.play();
            }}
            accessibilityRole="button"
            accessibilityLabel={status.playing ? "Pause" : "Play"}
            className="h-16 w-16 items-center justify-center rounded-full bg-ink active:scale-95"
          >
            {status.playing ? <PauseIcon color={c.bg} /> : <PlayIcon color={c.bg} />}
          </Pressable>
          <Pressable
            onPress={() => player.seekTo(Math.min(duration, time + SKIP))}
            accessibilityRole="button"
            accessibilityLabel="Forward 15 seconds"
            hitSlop={8}
          >
            <SkipIcon color={c.ink} forward />
          </Pressable>
        </View>

        {finished && (
          <View className="mt-4 flex-row items-center justify-center gap-2">
            <CheckIcon size={16} color={c.oliveDeep} />
            <Text className="font-sans-bold text-sm text-olive-deep">Counted for this week</Text>
          </View>
        )}
      </View>
    </View>
  );
}
