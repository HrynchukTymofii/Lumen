import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useRef, useState, type ComponentRef } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Light } from "@/components/Light";
import { TrackArt } from "@/components/TrackArt";
import { IconButton } from "@/components/ui/Button";
import { CheckIcon, CloseIcon, PauseIcon, PlayIcon, SkipIcon } from "@/components/ui/icons";
import { useColors } from "@/components/ui/theme";
import { cachedLibrary } from "@/lib/api/library";
import type { TrackVariant } from "@/lib/api/types";
import { hasAccount } from "@/lib/account";
import { track as trackEvent } from "@/lib/analytics";
import { markPrayed } from "@/lib/api/today";
import { reportError } from "@/lib/errorReporting";
import { reviewMoment } from "@/lib/review";
import { localAudio, recordPlayed } from "@/lib/userLibrary";

// Guided player (SPEC §10.2): the scene behind, the Light speaking, and the whole prayer as a scrolling text that
// follows the audio: the phrase being spoken is bright, the page scrolls with it, and it can be scrolled by hand
// (or a phrase tapped to jump there). Progress, back / play-pause / forward 15 s. Keeps playing with the screen
// locked. Finishing counts as "prayed" for the week. Opened with ?minutes= for the chosen length.

const SKIP = 15;
// After scrolling by hand, the text stays where it was put for this long before following the audio again
const HAND_SCROLL_MS = 5000;

function clock(seconds: number) {
  const s = Math.max(0, Math.floor(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

type Phrase = { text: string; start: number; paragraph: boolean };

// Splits a line into sentences, so a long line (or a prayer stored as one block) still moves along phrase by phrase.
// Very short pieces ("Amen.") stay their own phrase only at the end of a line.
function sentences(text: string) {
  const parts = text.match(/[^.!?…;:]+[.!?…;:]+["”’)]*\s*|[^.!?…;:]+$/g)?.map((p) => p.trim()).filter(Boolean) ?? [text];
  const out: string[] = [];
  for (const p of parts) {
    if (out.length && out[out.length - 1].length < 28) out[out.length - 1] += ` ${p}`;
    else out.push(p);
  }
  return out;
}

// When each phrase starts. Lines with timestamps keep them, and their sentences share the line's time by length.
// Without timestamps the time is shared across the whole prayer by length, which follows a steady reading voice.
function phrases(variant: TrackVariant | undefined, duration: number): Phrase[] {
  if (!variant) return [];
  const lines = variant.lines.flatMap((l) =>
    l.text
      .split(/\n+/)
      .map((t) => t.trim())
      .filter(Boolean)
      .map((text, i) => ({ text, t: i === 0 ? l.t : null })),
  );
  const timed = lines.length > 0 && lines.every((l) => l.t !== null);
  const out: Phrase[] = [];
  if (timed) {
    lines.forEach((l, i) => {
      const from = l.t!;
      const to = i + 1 < lines.length ? lines[i + 1].t! : Math.max(duration, from);
      const parts = sentences(l.text);
      const total = parts.reduce((n, p) => n + p.length, 0) || 1;
      let at = from;
      parts.forEach((p, j) => {
        out.push({ text: p, start: at, paragraph: j === 0 });
        at += ((to - from) * p.length) / total;
      });
    });
    return out;
  }
  const parts = lines.flatMap((l) => sentences(l.text).map((p, j) => ({ text: p, paragraph: j === 0 })));
  const total = parts.reduce((n, p) => n + p.text.length, 0) || 1;
  let at = 0;
  for (const p of parts) {
    out.push({ ...p, start: at });
    at += (duration * p.text.length) / total;
  }
  return out;
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
    if (track) player.setActiveForLockScreen(true, { title: track.title, artist: "Holy Hush" });
    player.play();
    if (track) {
      recordPlayed(track.id);
      trackEvent("prayer_audio_played", { prayer_type: track.category, prayer_slug: track.slug, minutes: variant?.minutes });
    }
    return () => player.setActiveForLockScreen(false);
    // Once per opening of the player (variant comes from the same params as track)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [player, track]);

  useEffect(() => {
    if (!status.didJustFinish || counted.current) return;
    counted.current = true;
    setFinished(true);
    if (track) trackEvent("prayer_audio_finished", { prayer_type: track.category, prayer_slug: track.slug, minutes: variant?.minutes });
    // The prayer week lives on the account
    if (hasAccount()) markPrayed(track?.id).catch(reportError);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status.didJustFinish, track?.id]);

  // Leaving after listening to the end is a moment to ask how Holy Hush is helping (lib/review.ts)
  useEffect(() => {
    const done = counted;
    return () => {
      if (done.current) reviewMoment("prayer");
    };
  }, []);

  const duration = status.duration || variant?.durationSec || 0;
  const time = status.currentTime;
  const list = useMemo(() => phrases(variant, duration), [variant, duration]);
  // The phrase being spoken: the last one that has started
  let current = 0;
  for (let i = 0; i < list.length; i++) if (list[i].start <= time + 0.2) current = i;
  if (finished) current = list.length - 1;

  // Follows the audio, unless the text was just scrolled by hand
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null);
  const tops = useRef<number[]>([]);
  const handScrolledAt = useRef(0);
  useEffect(() => {
    if (Date.now() - handScrolledAt.current < HAND_SCROLL_MS) return;
    const y = tops.current[current];
    if (y !== undefined) scroll.current?.scrollTo({ y: Math.max(0, y - 48), animated: true });
  }, [current]);

  const close = () => (router.canGoBack() ? router.back() : router.replace("/discover"));

  if (!track || !variant?.url) {
    // Opened directly without the catalog in memory, or a locked track: back to the prayer screen
    return (
      <View className="flex-1 items-center justify-center bg-bg px-8">
        <Text className="text-center font-sans text-base text-muted">This prayer can’t be played right now.</Text>
        <Pressable onPress={close} accessibilityRole="button" className="mt-4">
          <Text className="font-sans-semibold text-base text-ink underline">Go back</Text>
        </Pressable>
      </View>
    );
  }

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
        <Light size={64} state={status.playing ? "speaking" : "idle"} />
        <View className="h-10 min-w-10 items-center justify-center rounded-full bg-black/35 px-3">
          <Text className="font-sans-semibold text-sm text-white">{variant.minutes} min</Text>
        </View>
      </View>

      <View className="mx-3 mt-3 flex-1 overflow-hidden rounded-[32px] bg-bg/95" style={{ marginBottom: insets.bottom + 12 }}>
        <Text className="px-6 pt-5 font-sans text-sm text-muted" numberOfLines={1}>
          {track.title}
        </Text>

        {/* The whole prayer, following the audio */}
        <ScrollView
          ref={scroll}
          className="flex-1"
          contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 10, paddingBottom: 120 }}
          showsVerticalScrollIndicator={false}
          onScrollBeginDrag={() => (handScrolledAt.current = Date.now())}
          onMomentumScrollEnd={() => (handScrolledAt.current = Date.now())}
        >
          {list.map((p, i) => (
            <Pressable
              key={i}
              onLayout={(e) => (tops.current[i] = e.nativeEvent.layout.y)}
              onPress={() => {
                handScrolledAt.current = 0;
                if (finished) setFinished(false);
                player.seekTo(p.start);
                player.play();
              }}
              accessibilityRole="button"
              accessibilityHint="Plays from here"
              style={{ marginTop: p.paragraph && i > 0 ? 16 : 4 }}
            >
              <Text
                className="font-serif text-[21px] text-ink"
                style={{ lineHeight: 32, opacity: i === current ? 1 : i < current ? 0.55 : 0.3 }}
              >
                {p.text}
              </Text>
            </Pressable>
          ))}
          {finished && (
            <View className="mt-6 flex-row items-center gap-2">
              <CheckIcon size={16} color={c.ink} />
              <Text className="font-sans-semibold text-sm text-ink">Amen. Counted for this week</Text>
            </View>
          )}
        </ScrollView>

        <View className="border-t border-line px-6 pb-5 pt-4">
          <View className="h-1.5 overflow-hidden rounded-full bg-line">
            <View className="h-full rounded-full bg-ink" style={{ width: `${progress * 100}%` }} />
          </View>
          <View className="mt-1.5 flex-row justify-between">
            <Text className="font-sans text-xs text-muted">{clock(time)}</Text>
            <Text className="font-sans text-xs text-muted">{clock(duration)}</Text>
          </View>

          <View className="mt-2 flex-row items-center justify-center gap-8">
            <Pressable onPress={() => player.seekTo(Math.max(0, time - SKIP))} accessibilityRole="button" accessibilityLabel="Back 15 seconds" hitSlop={8}>
              <SkipIcon color={c.ink} />
            </Pressable>
            <Pressable
              onPress={() => {
                if (status.playing) return player.pause();
                if (finished) {
                  setFinished(false);
                  handScrolledAt.current = 0;
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
        </View>
      </View>
    </View>
  );
}
