import { useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Light } from "@/components/Light";
import { ScreenHeader } from "@/components/ScreenHeader";
import { TrackRow } from "@/components/TrackCard";
import { DownloadIcon, HeartIcon } from "@/components/ui/icons";
import { useColors } from "@/components/ui/theme";
import { errorMessage } from "@/lib/api/client";
import { cachedLibrary, getLibrary, getTrending } from "@/lib/api/library";
import type { Library } from "@/lib/api/types";
import { categoryTitle } from "@/lib/play";
import { downloadedIds, pick, removeDownload, toggleFavorite, useDownloads, useFavorites, useRecent } from "@/lib/userLibrary";

// A list of prayers. key: "c-<category>", "all", "quick", "trending", or one of the person's own lists
// ("recent", "favorites", "downloads").

const EMPTY: Record<string, string> = {
  recent: "Prayers you play will show up here.",
  favorites: "Tap the heart on any prayer to keep it here.",
  downloads: "Download a prayer to listen without a connection. It’s on each prayer’s page.",
  trending: "Nothing is trending yet.",
};

export default function ListScreen() {
  const { key } = useLocalSearchParams<{ key: string }>();
  const insets = useSafeAreaInsets();
  const c = useColors();
  const [library, setLibrary] = useState<Library | null>(cachedLibrary);
  const [trendingIds, setTrendingIds] = useState<string[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const recent = useRecent();
  const favorites = useFavorites();
  const downloads = useDownloads();

  useEffect(() => {
    if (!library) getLibrary().then(setLibrary, (err) => setError(errorMessage(err)));
    if (key === "trending") getTrending().then(setTrendingIds, () => setTrendingIds([]));
  }, [key, library]);

  const tracks = useMemo(() => {
    const all = library?.tracks ?? [];
    if (key === "all") return all;
    if (key === "quick") return all.filter((t) => t.variants.some((v) => v.minutes === 1));
    if (key === "recent") return pick(all, recent.map((r) => r.id));
    if (key === "favorites") return pick(all, favorites);
    if (key === "downloads") return pick(all, downloadedIds(downloads));
    if (key === "trending") return pick(all, trendingIds ?? []);
    if (key.startsWith("c-")) return all.filter((t) => t.category === key.slice(2));
    return [];
  }, [library, key, recent, favorites, downloads, trendingIds]);

  const title =
    key === "all"
      ? "All prayers"
      : key === "quick"
        ? "Quick prayers"
        : key === "recent"
          ? "Recently prayed"
          : key === "favorites"
            ? "Favorites"
            : key === "downloads"
              ? "Downloads"
              : key === "trending"
                ? "Trending"
                : categoryTitle(key.slice(2));

  return (
    <View className="flex-1 bg-bg">
      <ScreenHeader title={title} fallback="/discover" />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 32 }}>
        {!library ? (
          <View className="mt-10 items-center">{error ? <Text className="font-sans text-base text-muted">{error}</Text> : <Light size={56} state="thinking" />}</View>
        ) : !tracks.length ? (
          <View className="mt-10 items-center px-4">
            <Light size={56} />
            <Text className="mt-3 text-center font-sans text-base leading-6 text-muted">{EMPTY[key] ?? "No prayers here yet."}</Text>
          </View>
        ) : (
          tracks.map((t, i) => (
            <TrackRow
              key={t.id}
              track={t}
              seed={i + 3}
              right={
                key === "favorites" ? (
                  <Pressable onPress={() => toggleFavorite(t.id)} accessibilityRole="button" accessibilityLabel="Remove from favorites" hitSlop={10}>
                    <HeartIcon size={20} color={c.oliveDeep} filled />
                  </Pressable>
                ) : key === "downloads" ? (
                  <Pressable
                    onPress={() => Object.values(downloads).filter((d) => d.id === t.id).forEach((d) => removeDownload(d.id, d.minutes))}
                    accessibilityRole="button"
                    accessibilityLabel="Remove download"
                    hitSlop={10}
                    className="flex-row items-center gap-1"
                  >
                    <DownloadIcon size={18} color={c.muted} />
                    <Text className="font-sans-bold text-xs text-muted">Remove</Text>
                  </Pressable>
                ) : undefined
              }
            />
          ))
        )}
      </ScrollView>
    </View>
  );
}
