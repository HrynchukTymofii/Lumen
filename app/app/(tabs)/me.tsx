import { router, useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState, type ReactNode } from "react";
import { Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Light } from "@/components/Light";
import { RichText } from "@/components/RichText";
import { SectionTitle, TrackCard } from "@/components/TrackCard";
import { BoltIcon, ChevronIcon, DownloadIcon, GearIcon, HeartIcon, NoteIcon, PlusIcon } from "@/components/ui/icons";
import { useColors } from "@/components/ui/theme";
import { useAuth } from "@/context/AuthContext";
import { cachedLibrary, getLibrary } from "@/lib/api/library";
import { getToday } from "@/lib/api/today";
import type { Library, Streak } from "@/lib/api/types";
import { useMarks } from "@/lib/bibleMarks";
import { reportError } from "@/lib/errorReporting";
import { JOURNAL_LABELS, useJournal, type JournalKind } from "@/lib/journal";
import { downloadedIds, pick, useDownloads, useFavorites, useRecent } from "@/lib/userLibrary";

// Me (replaces Journey): name and Settings, the week's streak (→ the Streak screen), then the person's own shelves:
// recently prayed, favorites, downloads, intentions, reflections, Bible notes.

export default function MeScreen() {
  const { user, premium } = useAuth();
  const insets = useSafeAreaInsets();
  const c = useColors();
  const [streak, setStreak] = useState<Streak | null>(null);
  const [library, setLibrary] = useState<Library | null>(cachedLibrary);
  const [refreshing, setRefreshing] = useState(false);
  const recent = useRecent();
  const favorites = useFavorites();
  const downloads = useDownloads();
  const markCount = Object.keys(useMarks()).length;

  const load = useCallback(
    () =>
      Promise.all([getToday().then((t) => setStreak(t.streak)), getLibrary().then(setLibrary)]).catch(reportError),
    [],
  );

  // Praying elsewhere changes the week, so reload on every visit
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const tracks = library?.tracks;
  const recentTracks = useMemo(() => pick(tracks, recent.map((r) => r.id)), [tracks, recent]);
  const favoriteTracks = useMemo(() => pick(tracks, favorites), [tracks, favorites]);
  const downloadTracks = useMemo(() => pick(tracks, downloadedIds(downloads)), [tracks, downloads]);
  const daysThisWeek = streak?.doneThisWeek.filter(Boolean).length ?? 0;
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
      <View className="flex-row items-center gap-3 px-5">
        <Light size={44} />
        <Text className="flex-1 font-display text-[32px] leading-10 text-ink" numberOfLines={1}>
          {user?.firstName || "Me"}
        </Text>
        <Pressable
          onPress={() => router.push("/settings")}
          accessibilityRole="button"
          accessibilityLabel="Settings"
          hitSlop={8}
          className="h-11 w-11 items-center justify-center rounded-full bg-card active:opacity-70"
        >
          <GearIcon color={c.ink} />
        </Pressable>
      </View>

      {/* Streak */}
      <View className="mt-7">
        <SectionTitle title="Streak" onPress={() => router.push("/streak")} />
        <Pressable
          onPress={() => router.push("/streak")}
          accessibilityRole="button"
          className="mx-4 flex-row items-center gap-4 rounded-[24px] border-[1.5px] border-line2 bg-card px-5 py-5 active:opacity-80"
        >
          <View className="flex-row items-center gap-1.5">
            <BoltIcon size={22} color={c.oliveDeep} filled />
            <Text className="font-display text-[30px] leading-9 text-ink">{daysThisWeek}</Text>
          </View>
          <Text className="flex-1 font-sans text-[15px] leading-5 text-muted">
            {!streak
              ? " "
              : streak.prayedToday
                ? `${daysThisWeek} of ${streak.goal} days this week. Well done.`
                : daysThisWeek
                  ? `${daysThisWeek} of ${streak.goal} days this week. Pray today to keep going.`
                  : "Pray today and start building a habit."}
          </Text>
        </Pressable>
      </View>

      {!premium.active && (
        <Pressable onPress={() => router.push("/paywall")} accessibilityRole="button" className="mx-4 mt-4 flex-row items-center gap-3 rounded-[24px] bg-butter px-5 py-4 active:opacity-85">
          <Light size={28} />
          <Text className="flex-1 font-sans-bold text-[15px] text-on-pastel">Try Premium free for 7 days</Text>
          <ChevronIcon color={c.onPastel} />
        </Pressable>
      )}

      {recentTracks.length > 0 && (
        <Shelf title="Recently prayed" onMore={() => list("recent")}>
          {recentTracks.slice(0, 10).map((t, i) => (
            <TrackCard key={t.id} track={t} seed={i + 2} />
          ))}
        </Shelf>
      )}

      <Shelf title="Favorites" onMore={() => list("favorites")}>
        {favoriteTracks.length ? (
          favoriteTracks.map((t, i) => <TrackCard key={t.id} track={t} seed={i + 5} />)
        ) : (
          <EmptyTile label="Tap the heart on a prayer" onPress={() => router.navigate("/discover")}>
            <HeartIcon size={26} color={c.muted} />
          </EmptyTile>
        )}
      </Shelf>

      <Shelf title="Downloads" onMore={() => list("downloads")}>
        {downloadTracks.length ? (
          downloadTracks.map((t, i) => <TrackCard key={t.id} track={t} seed={i + 8} />)
        ) : (
          <EmptyTile label="Save prayers for offline" onPress={() => router.navigate("/discover")}>
            <DownloadIcon size={26} color={c.muted} />
          </EmptyTile>
        )}
      </Shelf>

      <JournalSection kind="intention" />
      <JournalSection kind="reflection" />

      <View className="mt-8">
        <SectionTitle title="Bible notes" onPress={() => router.push("/bible/notes")} />
        <Pressable onPress={() => router.push("/bible/notes")} accessibilityRole="button" className="mx-4 flex-row items-center gap-3 rounded-[24px] bg-card px-5 py-4 active:opacity-80">
          <NoteIcon size={20} color={c.ink} />
          <Text className="flex-1 font-sans-bold text-base text-ink">Notes, highlights & bookmarks</Text>
          {markCount > 0 && <Text className="font-sans text-sm text-muted">{markCount}</Text>}
          <ChevronIcon color={c.muted} />
        </Pressable>
      </View>
    </ScrollView>
  );
}

function Shelf({ title, onMore, children }: { title: string; onMore: () => void; children: ReactNode }) {
  return (
    <View className="mt-8">
      <SectionTitle title={title} onPress={onMore} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 14, paddingHorizontal: 20 }}>
        {children}
      </ScrollView>
    </View>
  );
}

function EmptyTile({ label, onPress, children }: { label: string; onPress: () => void; children: ReactNode }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} className="h-[143px] w-[200px] items-center justify-center gap-2 rounded-3xl bg-card active:opacity-80">
      {children}
      <Text className="font-sans text-sm text-muted">{label}</Text>
    </Pressable>
  );
}

// Intentions / Reflections: the two newest, or a big "+ Add" box
function JournalSection({ kind }: { kind: JournalKind }) {
  const c = useColors();
  const entries = useJournal(kind);
  const labels = JOURNAL_LABELS[kind];
  const open = (extra?: Record<string, string>) => router.push({ pathname: "/journal/[kind]", params: { kind, ...extra } });
  return (
    <View className="mt-8">
      <SectionTitle
        title={labels.plural}
        onPress={() => open()}
        right={
          <Pressable
            onPress={() => open({ new: "1" })}
            accessibilityRole="button"
            accessibilityLabel={`Add ${labels.single.toLowerCase()}`}
            className="h-11 w-11 items-center justify-center rounded-full border-[1.5px] border-line2 active:opacity-70"
          >
            <PlusIcon size={20} color={c.ink} />
          </Pressable>
        }
      />
      {entries.length ? (
        <View className="mx-4 gap-2.5">
          {entries.slice(0, 2).map((e) => (
            <Pressable key={e.id} onPress={() => open({ edit: e.id })} accessibilityRole="button" className="rounded-[22px] bg-card px-5 py-4 active:opacity-80">
              {e.title ? (
                <Text className="font-sans-bold text-base text-ink" numberOfLines={1}>
                  {e.title}
                </Text>
              ) : null}
              {e.body ? (
                <View className={e.title ? "mt-1" : ""}>
                  <RichText text={e.body} lines={2} className="font-sans text-[15px] leading-6 text-muted" />
                </View>
              ) : null}
            </Pressable>
          ))}
        </View>
      ) : (
        <Pressable onPress={() => open({ new: "1" })} accessibilityRole="button" className="mx-4 flex-row items-center justify-center gap-2 rounded-[22px] bg-card py-6 active:opacity-80">
          <PlusIcon size={18} color={c.muted} />
          <Text className="font-sans text-[17px] text-muted">Add {labels.plural}</Text>
        </Pressable>
      )}
    </View>
  );
}
