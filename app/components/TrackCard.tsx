import type { ReactNode } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import type { Track } from "@/lib/api/types";
import { categoryTitle, openTrack, trackMinutes } from "@/lib/play";
import { TrackArt } from "./TrackArt";
import { ChevronIcon, LockIcon } from "./ui/icons";
import { useColors } from "./ui/theme";

// Prayer cards for the shelves on Home, Discover and Me: art on top, title, subtitle, length underneath.

export function TrackCard({ track, width = 200, aspect = 1.4, seed = 2 }: { track: Track; width?: number; aspect?: number; seed?: number }) {
  const c = useColors();
  return (
    <Pressable
      onPress={() => openTrack(track)}
      accessibilityRole="button"
      accessibilityLabel={`${track.title}${track.locked ? ", Premium" : ""}`}
      style={{ width }}
      className="active:opacity-80"
    >
      <View className="overflow-hidden rounded-3xl bg-card" style={{ width, height: width / aspect }}>
        <TrackArt imageUrl={track.imageUrl} scene={track.scene} options={{ seed, noBigTrees: true }} />
        {track.locked && (
          <View className="absolute right-2.5 top-2.5 h-7 w-7 items-center justify-center rounded-full bg-ink/75">
            <LockIcon size={13} color={c.bg} />
          </View>
        )}
      </View>
      <Text className="mt-2.5 font-sans-bold text-[16px] leading-5 text-ink" numberOfLines={1}>
        {track.title}
      </Text>
      <Text className="mt-0.5 font-sans text-sm text-ink/80" numberOfLines={1}>
        {track.subtitle || categoryTitle(track.category)}
      </Text>
      <Text className="mt-0.5 font-sans text-[13px] text-muted">{trackMinutes(track)}</Text>
    </Pressable>
  );
}

/** A list row: square art, title, subtitle, length */
export function TrackRow({ track, seed = 3, right }: { track: Track; seed?: number; right?: ReactNode }) {
  const c = useColors();
  return (
    <Pressable onPress={() => openTrack(track)} accessibilityRole="button" className="flex-row items-center gap-4 py-2 active:opacity-80">
      <View className="h-[72px] w-[72px] overflow-hidden rounded-2xl bg-card">
        <TrackArt imageUrl={track.imageUrl} scene={track.scene} options={{ seed, noBigTrees: true }} />
      </View>
      <View className="flex-1">
        <Text className="font-sans-bold text-[16px] leading-5 text-ink" numberOfLines={1}>
          {track.title}
        </Text>
        <Text className="mt-0.5 font-sans text-sm text-ink/80" numberOfLines={1}>
          {track.subtitle || categoryTitle(track.category)}
        </Text>
        <View className="mt-0.5 flex-row items-center gap-1.5">
          {track.locked && <LockIcon size={11} color={c.muted} />}
          <Text className="font-sans text-[13px] text-muted">{trackMinutes(track)}</Text>
        </View>
      </View>
      {right}
    </Pressable>
  );
}

/** A titled horizontal row of cards */
export function Shelf({ title, onMore, tracks, width, aspect }: { title: string; onMore?: () => void; tracks: Track[]; width?: number; aspect?: number }) {
  if (!tracks.length) return null;
  return (
    <View className="mt-8">
      <SectionTitle title={title} onPress={onMore} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 14, paddingHorizontal: 20 }}>
        {tracks.map((t, i) => (
          <TrackCard key={t.id} track={t} width={width} aspect={aspect} seed={i + 2} />
        ))}
      </ScrollView>
    </View>
  );
}

/** "Recently prayed ›" — the chevron and tap only when there's somewhere to go */
export function SectionTitle({ title, onPress, right }: { title: string; onPress?: () => void; right?: ReactNode }) {
  const c = useColors();
  return (
    <View className="mb-3 flex-row items-center justify-between px-5">
      <Pressable onPress={onPress} disabled={!onPress} accessibilityRole={onPress ? "button" : "header"} className="flex-row items-center gap-1 active:opacity-70">
        <Text className="font-display text-[24px] leading-8 text-ink">{title}</Text>
        {onPress && <ChevronIcon size={20} color={c.ink} />}
      </Pressable>
      {right}
    </View>
  );
}
