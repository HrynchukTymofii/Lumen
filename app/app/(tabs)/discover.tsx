import { router } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ArtTile } from "@/components/ArtTile";
import { Light } from "@/components/Light";
import { Scene } from "@/components/Scene";
import { SectionTitle, TrackRow } from "@/components/TrackCard";
import { TrackArt } from "@/components/TrackArt";
import { LineButton } from "@/components/ui/Button";
import { SearchIcon } from "@/components/ui/icons";
import { useColors } from "@/components/ui/theme";
import { useAuth } from "@/context/AuthContext";
import { errorMessage } from "@/lib/api/client";
import { cachedLibrary, getLibrary } from "@/lib/api/library";
import type { Library } from "@/lib/api/types";
import { reportError } from "@/lib/errorReporting";
import { categoryTitle } from "@/lib/play";

// Discover (replaces Prayers): search, then a grid of ways in (each category that has prayers, short prayers,
// the Bible, the companion), then every prayer. Tiles appear as the catalog published in /admin grows.

export default function DiscoverScreen() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const c = useColors();
  const [library, setLibrary] = useState<Library | null>(cachedLibrary);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(
    () =>
      getLibrary().then(
        (data) => {
          setLibrary(data);
          setError(null);
        },
        (err) => {
          reportError(err);
          setError(errorMessage(err));
        },
      ),
    [],
  );

  useEffect(() => {
    load();
  }, [load]);

  const tracks = useMemo(() => library?.tracks ?? [], [library]);
  // One tile per category with prayers, in catalog order, using its first prayer's art
  const categories = useMemo(() => {
    const seen = new Map<string, (typeof tracks)[number]>();
    tracks.forEach((t) => seen.has(t.category) || seen.set(t.category, t));
    return [...seen.entries()];
  }, [tracks]);
  const quick = tracks.filter((t) => t.variants.some((v) => v.minutes === 1));

  const list = (key: string) => router.push({ pathname: "/list/[key]", params: { key } });

  return (
    <ScrollView
      className="flex-1 bg-bg"
      contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: 40 }}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          tintColor={c.muted}
          onRefresh={() => {
            setRefreshing(true);
            load().finally(() => setRefreshing(false));
          }}
        />
      }
    >
      <Text className="px-5 font-display text-[34px] leading-10 text-ink">Discover</Text>

      <Pressable
        onPress={() => router.push("/search")}
        accessibilityRole="search"
        className="mx-4 mt-4 h-[52px] flex-row items-center gap-2.5 rounded-full border-[1.5px] border-line2 bg-card px-5 active:opacity-80"
      >
        <SearchIcon size={20} color={c.muted} />
        <Text className="font-sans text-base text-muted">Prayers, topics, Bible books…</Text>
      </Pressable>

      {!library ? (
        error ? (
          <View className="mx-4 mt-5 gap-3 rounded-[28px] bg-card p-6">
            <Text className="font-sans text-base text-muted">{error}</Text>
            <LineButton label="Try again" onPress={load} />
          </View>
        ) : (
          <View className="mt-10 items-center">
            <Light size={56} state="thinking" />
          </View>
        )
      ) : (
        <>
          <View className="mt-5 flex-row flex-wrap justify-between gap-y-3 px-4">
            {categories.map(([key, first], i) => (
              <ArtTile
                key={key}
                label={categoryTitle(key)}
                onPress={() => list(`c-${key}`)}
                art={<TrackArt imageUrl={first.imageUrl} scene={first.scene} options={{ seed: i + 4, noBigTrees: true }} />}
              />
            ))}
            {quick.length >= 2 && <ArtTile label="Quick prayers" onPress={() => list("quick")} art={<Scene name="golden" options={{ seed: 21, noBigTrees: true }} />} />}
            <ArtTile label="The Bible" onPress={() => router.navigate("/bible")} art={<Scene name="meadow" options={{ seed: 5 }} />} />
            {user?.aiEnabled && (
              <ArtTile
                label="Ask the companion"
                onPress={() => router.navigate("/companion")}
                art={
                  <View className="flex-1">
                    <Scene name="sky" options={{ noSun: true, seed: 9 }} />
                    <View className="absolute inset-0 items-center justify-center pb-6">
                      <Light size={54} />
                    </View>
                  </View>
                }
              />
            )}
            <ArtTile label="Notes & highlights" onPress={() => router.push("/bible/notes")} art={<Scene name="dusk" options={{ seed: 13, noBigTrees: true }} />} />
          </View>

          {tracks.length > 0 ? (
            <View className="mt-9">
              <SectionTitle title="All prayers" onPress={() => list("all")} />
              <View className="px-5">
                {tracks.slice(0, 12).map((t, i) => (
                  <TrackRow key={t.id} track={t} seed={i + 3} />
                ))}
              </View>
              {tracks.length > 12 && (
                <View className="mx-4 mt-3">
                  <LineButton label={`See all ${tracks.length} prayers`} onPress={() => list("all")} />
                </View>
              )}
            </View>
          ) : (
            <View className="mx-4 mt-6 items-center rounded-[28px] bg-card px-6 py-8">
              <Light size={56} />
              <Text className="mt-3 text-center font-sans text-base leading-6 text-muted">
                The first guided prayers are being recorded. They’ll appear here as soon as they’re published.
              </Text>
            </View>
          )}
        </>
      )}
    </ScrollView>
  );
}
