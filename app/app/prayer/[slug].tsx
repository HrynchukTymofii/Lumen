import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Light } from "@/components/Light";
import { Scene } from "@/components/Scene";
import { IconButton, OliveButton } from "@/components/ui/Button";
import { BackIcon, BookIcon, LockIcon } from "@/components/ui/icons";
import { useColors } from "@/components/ui/theme";
import { errorMessage } from "@/lib/api/client";
import { cachedLibrary, getLibrary } from "@/lib/api/library";
import type { Track } from "@/lib/api/types";

// Prayer detail (SPEC §10.2): scene, title, length switch (1 / 3 / 5 min), "Pray" (the guided player, when the
// length has audio) and the text. Locked prayers show their first lines (the server sends no more) and the paywall.

export default function PrayerScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const insets = useSafeAreaInsets();
  const c = useColors();
  const [track, setTrack] = useState<Track | null | undefined>(() => cachedLibrary()?.tracks.find((t) => t.slug === slug));
  const [error, setError] = useState<string | null>(null);
  const [minutes, setMinutes] = useState<number | null>(null);

  // Opened without the catalog in memory (e.g. from a link): load it
  useEffect(() => {
    if (track !== undefined) return;
    getLibrary().then(
      (lib) => setTrack(lib.tracks.find((t) => t.slug === slug) ?? null),
      (err) => setError(errorMessage(err)),
    );
  }, [slug, track]);

  // The middle length reads best, like on the web
  const variant = track ? (track.variants.find((v) => v.minutes === (minutes ?? 3)) ?? track.variants[0]) : undefined;

  return (
    <View className="flex-1 bg-bg">
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}>
        <View style={{ height: 300 }}>
          <Scene name={track?.scene ?? "dawn"} />
        </View>

        <View className="mx-4 -mt-[60px] rounded-[28px] bg-card px-6 pb-6 pt-6">
          {track ? (
            <>
              <Text className="font-sans-bold text-xs uppercase tracking-[2px] text-olive-deep">{track.category}</Text>
              <Text className="mt-1.5 font-display text-[28px] leading-[34px] text-ink">{track.title}</Text>
              {track.subtitle && <Text className="mt-1.5 font-sans text-base text-muted">{track.subtitle}</Text>}

              {track.variants.length > 1 && (
                <View className="mt-4 flex-row gap-2">
                  {track.variants.map((v) => {
                    const on = v === variant;
                    return (
                      <Pressable
                        key={v.minutes}
                        onPress={() => setMinutes(v.minutes)}
                        accessibilityRole="button"
                        accessibilityState={{ selected: on }}
                        className={`rounded-full border-[1.5px] px-4 py-2 ${on ? "border-ink bg-ink" : "border-line2"}`}
                      >
                        <Text className={`font-sans-bold text-sm ${on ? "text-bg" : "text-ink"}`}>{v.minutes} min</Text>
                      </Pressable>
                    );
                  })}
                </View>
              )}

              {variant?.url && (
                <View className="mt-5 items-start">
                  <OliveButton
                    label="Pray"
                    onPress={() => router.push({ pathname: "/player/[slug]", params: { slug: track.slug, minutes: String(variant.minutes) } })}
                  />
                </View>
              )}

              {variant ? (
                <View className="mt-5 gap-4">
                  {variant.lines.map((l, i) => (
                    <Text key={i} className="font-serif text-[17px] leading-7 text-ink">
                      {l.text}
                    </Text>
                  ))}
                </View>
              ) : (
                <Text className="mt-5 font-sans text-base text-muted">This prayer has no text yet.</Text>
              )}

              {track.locked && (
                <Pressable
                  onPress={() => router.push("/paywall")}
                  accessibilityRole="button"
                  className="mt-6 flex-row items-center gap-3 rounded-2xl bg-butter px-4 py-4 active:opacity-80"
                >
                  <LockIcon size={18} color={c.onPastel} />
                  <Text className="flex-1 font-sans-bold text-[15px] leading-6 text-on-pastel">
                    The full prayer and audio are in Premium. Try it free for 7 days.
                  </Text>
                </Pressable>
              )}

              {track.scriptureRefs.length > 0 && (
                <View className="mt-6 flex-row flex-wrap gap-2">
                  {track.scriptureRefs.map((ref) => (
                    <View key={ref} className="flex-row items-center gap-1.5 rounded-full border-[1.5px] border-olive-deep/40 px-3 py-1.5">
                      <BookIcon size={13} color={c.oliveDeep} />
                      <Text className="font-sans-bold text-[13px] text-olive-deep">{ref}</Text>
                    </View>
                  ))}
                </View>
              )}
            </>
          ) : track === null ? (
            <Text className="font-sans text-base text-muted">This prayer isn’t available anymore.</Text>
          ) : error ? (
            <Text className="font-sans text-base text-muted">{error}</Text>
          ) : (
            <View className="items-center py-6">
              <Light size={56} state="thinking" />
            </View>
          )}
        </View>
      </ScrollView>

      <View style={{ position: "absolute", top: insets.top + 8, left: 16 }}>
        <IconButton label="Back" onPress={() => (router.canGoBack() ? router.back() : router.replace("/prayers"))}>
          <BackIcon color={c.ink} />
        </IconButton>
      </View>
    </View>
  );
}
