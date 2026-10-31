import { router } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Light } from "@/components/Light";
import { Scene } from "@/components/Scene";
import { LineButton } from "@/components/ui/Button";
import { LockIcon } from "@/components/ui/icons";
import { useColors } from "@/components/ui/theme";
import { errorMessage } from "@/lib/api/client";
import { cachedLibrary, getLibrary } from "@/lib/api/library";
import type { Library } from "@/lib/api/types";
import { reportError } from "@/lib/errorReporting";

// Prayers (SPEC §10.2): filter chips + a 2-column grid of illustrated tiles. The catalog is published in /admin.

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export default function PrayersScreen() {
  const insets = useSafeAreaInsets();
  const c = useColors();
  const [library, setLibrary] = useState<Library | null>(cachedLibrary);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [category, setCategory] = useState<string | null>(null);

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
  // Only categories that have prayers, in catalog order
  const categories = useMemo(() => [...new Set(tracks.map((t) => t.category))], [tracks]);
  const shown = category ? tracks.filter((t) => t.category === category) : tracks;

  return (
    <ScrollView
      className="flex-1 bg-bg"
      contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: 32 }}
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
      <View className="px-5">
        <Text className="font-display text-[30px] leading-9 text-ink">Prayers</Text>
        <Text className="mt-1 font-sans text-base text-muted">Guided prayers for every part of the day.</Text>
      </View>

      {categories.length > 1 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 20 }} className="mt-4">
          {[null, ...categories].map((cat) => {
            const on = cat === category;
            return (
              <Pressable
                key={cat ?? "all"}
                onPress={() => setCategory(cat)}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                className={`rounded-full border-[1.5px] px-4 py-2 ${on ? "border-ink bg-ink" : "border-line2 bg-card"}`}
              >
                <Text className={`font-sans-bold text-sm ${on ? "text-bg" : "text-ink"}`}>{cat ? capitalize(cat) : "All"}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      )}

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
      ) : !tracks.length ? (
        <View className="mx-4 mt-5 items-center rounded-[28px] bg-card px-6 py-8">
          <Light size={56} />
          <Text className="mt-3 text-center font-sans text-base leading-6 text-muted">
            The first guided prayers are being recorded. They’ll appear here as soon as they’re published.
          </Text>
        </View>
      ) : (
        <View className="mt-4 flex-row flex-wrap gap-3 px-4">
          {shown.map((t, i) => (
            <Pressable
              key={t.id}
              onPress={() => router.push({ pathname: "/prayer/[slug]", params: { slug: t.slug } })}
              accessibilityRole="button"
              accessibilityLabel={`${t.title}${t.locked ? ", Premium" : ""}`}
              className="overflow-hidden rounded-3xl bg-card active:opacity-80"
              style={{ width: "48.3%", aspectRatio: 0.82 }}
            >
              <Scene name={t.scene} options={{ seed: i + 2, noBigTrees: true }} />
              {t.locked && (
                <View className="absolute right-2.5 top-2.5 flex-row items-center gap-1 rounded-full bg-ink/80 px-2.5 py-1">
                  <LockIcon size={12} color={c.bg} />
                  <Text className="font-sans-bold text-[11px] text-bg">Premium</Text>
                </View>
              )}
              <View className="absolute bottom-0 left-0 right-0 bg-card/90 px-3.5 py-3">
                <Text className="font-sans-bold text-[15px] leading-5 text-ink" numberOfLines={2}>
                  {t.title}
                </Text>
                <Text className="mt-0.5 font-sans text-xs text-muted">
                  {t.variants.map((v) => v.minutes).join(" · ")} min · {capitalize(t.category)}
                </Text>
              </View>
            </Pressable>
          ))}
        </View>
      )}
    </ScrollView>
  );
}
