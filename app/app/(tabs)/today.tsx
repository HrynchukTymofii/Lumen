import { router, useFocusEffect } from "expo-router";
import { setStatusBarStyle } from "expo-status-bar";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Share, Text, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";
import { Light } from "@/components/Light";
import { StreakWeek } from "@/components/StreakWeek";
import { Shelf, SectionTitle, TrackCard } from "@/components/TrackCard";
import { TrackArt } from "@/components/TrackArt";
import { LineButton, OliveButton } from "@/components/ui/Button";
import { BellIcon, CheckIcon, ChevronIcon, PlayIcon, SearchIcon, ShareIcon } from "@/components/ui/icons";
import { useColors } from "@/components/ui/theme";
import { useAuth } from "@/context/AuthContext";
import { createConversation } from "@/lib/api/chat";
import { errorMessage } from "@/lib/api/client";
import { cachedLibrary, getLibrary, getTrending } from "@/lib/api/library";
import { applyGrace, getToday, markPrayed } from "@/lib/api/today";
import type { Library, Streak, Today, Track } from "@/lib/api/types";
import { reportError } from "@/lib/errorReporting";
import { requestPermission, scheduleReminders } from "@/lib/notifications";
import { categoryTitle, playTrack, shareApp } from "@/lib/play";
import { pick, useRecent } from "@/lib/userLibrary";

// Today (SPEC §10.2, reworked after the Hallow screens in /assets): a full-bleed carousel of prayers you can start with
// one tap, quick links, the verse of the day as a quote, today's prayer and the week, then shelves of prayers.
// Loading it also re-schedules the daily reminders (lib/notifications.ts).

const DEFAULT_REMINDER = "07:30";

// Which categories lead, by time of day
function categoryOrder(hour: number) {
  if (hour >= 20 || hour < 4) return ["sleep", "evening", "psalms", "peace", "grief", "family", "morning"];
  if (hour >= 17) return ["evening", "psalms", "peace", "sleep", "grief", "family", "morning"];
  return ["morning", "psalms", "peace", "family", "grief", "evening", "sleep"];
}

const dayNumber = () => Math.floor((Date.now() - new Date().getTimezoneOffset() * 60_000) / 86_400_000);

// Up to five prayers for the carousel: ones with audio first, the time of day's category first, rotating daily
function featured(tracks: Track[], hour: number) {
  const order = categoryOrder(hour);
  const playable = tracks.filter((t) => t.variants.some((v) => v.url) || t.locked);
  const pool = (playable.length ? playable : tracks).slice();
  const shift = pool.length ? dayNumber() % pool.length : 0;
  const rotated = [...pool.slice(shift), ...pool.slice(0, shift)];
  return rotated.sort((a, b) => order.indexOf(a.category) - order.indexOf(b.category)).slice(0, 5);
}

export default function HomeScreen() {
  const { user, updateProfile } = useAuth();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const c = useColors();
  const [today, setToday] = useState<Today | null>(null);
  const [library, setLibrary] = useState<Library | null>(cachedLibrary);
  const [trendingIds, setTrendingIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [marking, setMarking] = useState(false);
  const [celebrating, setCelebrating] = useState(false);
  const [slide, setSlide] = useState(0);
  const recent = useRecent();

  const load = useCallback(
    () =>
      Promise.all([
        getToday().then(setToday),
        getLibrary().then(setLibrary),
        // Trending is a nice-to-have: a failure just leaves the shelf out
        getTrending().then(setTrendingIds, () => {}),
      ]).then(
        () => setError(null),
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

  // Light status bar text over the carousel art; back to the theme's default elsewhere
  useFocusEffect(
    useCallback(() => {
      setStatusBarStyle("light");
      return () => setStatusBarStyle("auto");
    }, []),
  );

  // Keeps the next week of reminders scheduled, without today's once it's prayed
  const prayedToday = today?.streak.prayedToday;
  useEffect(() => {
    if (!user || prayedToday === undefined) return;
    scheduleReminders({ time: user.reminderTime, enabled: user.remindersEnabled, prayedToday, name: user.firstName }).catch(reportError);
  }, [user, prayedToday]);

  const setStreak = (streak: Streak) => setToday((t) => (t ? { ...t, streak } : t));

  const pray = async () => {
    setMarking(true);
    try {
      setStreak(await markPrayed());
      setCelebrating(true);
      setTimeout(() => setCelebrating(false), 2500);
    } catch (err) {
      reportError(err);
      setError(errorMessage(err));
    } finally {
      setMarking(false);
    }
  };

  const grace = async () => {
    try {
      setStreak(await applyGrace());
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  const turnOnReminders = async () => {
    if (!(await requestPermission())) {
      setError("Notifications are off for Lumen. You can allow them in your phone’s settings.");
      return;
    }
    updateProfile({ reminderTime: DEFAULT_REMINDER, remindersEnabled: true }).catch((err) => setError(errorMessage(err)));
  };

  const hour = new Date().getHours();
  const tracks = useMemo(() => library?.tracks ?? [], [library]);
  const hero = useMemo(() => featured(tracks, hour), [tracks, hour]);
  const recentTracks = useMemo(() => pick(tracks, recent.map((r) => r.id)), [tracks, recent]);
  const trending = useMemo(() => pick(tracks, trendingIds), [tracks, trendingIds]);
  const shelves = useMemo(
    () =>
      categoryOrder(hour)
        .map((key) => ({ key, tracks: tracks.filter((t) => t.category === key) }))
        .filter((s) => s.tracks.length),
    [tracks, hour],
  );
  // Short, free prayers for someone new
  const starters = useMemo(
    () => tracks.filter((t) => !t.locked).sort((a, b) => Math.min(...a.variants.map((v) => v.minutes)) - Math.min(...b.variants.map((v) => v.minutes))).slice(0, 3),
    [tracks],
  );
  const streak = today?.streak;
  const heroHeight = Math.min(Math.round(height * 0.62), 580);

  return (
    <ScrollView
      className="flex-1 bg-bg"
      contentContainerStyle={{ paddingBottom: 40 }}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          tintColor="#fff"
          progressViewOffset={insets.top}
          onRefresh={() => {
            setRefreshing(true);
            load().finally(() => setRefreshing(false));
          }}
        />
      }
    >
      {/* Carousel: tap anywhere on a slide to start praying */}
      <View style={{ height: heroHeight, backgroundColor: "#1D2518" }}>
        {hero.length ? (
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(e) => setSlide(Math.round(e.nativeEvent.contentOffset.x / width))}
          >
            {hero.map((t, i) => (
              <Pressable
                key={t.id}
                onPress={() => playTrack(t)}
                accessibilityRole="button"
                accessibilityLabel={`Play ${t.title}`}
                style={{ width, height: heroHeight }}
              >
                <TrackArt imageUrl={t.imageUrl} scene={t.scene} options={{ seed: i + 7 }} />
                <Shade height={heroHeight} />
                <View className="absolute inset-0 items-center justify-center">
                  <View className="h-[88px] w-[88px] items-center justify-center rounded-full bg-white/85">
                    <PlayIcon size={34} color="#141A10" />
                  </View>
                </View>
                <View className="absolute bottom-0 left-0 right-0 px-6 pb-11">
                  <View className="self-start rounded-lg bg-white/20 px-2.5 py-1">
                    <Text className="font-sans-semibold text-[13px] text-white">{categoryTitle(t.category)}</Text>
                  </View>
                  <Text className="mt-2.5 font-display text-[30px] leading-9 text-white" numberOfLines={2}>
                    {t.title}
                  </Text>
                  <Text className="mt-1 font-sans text-base text-white/85" numberOfLines={1}>
                    {t.locked ? "Premium" : `${t.variants.map((v) => v.minutes).join(" · ")} min`}
                    {t.subtitle ? ` · ${t.subtitle}` : ""}
                  </Text>
                </View>
              </Pressable>
            ))}
          </ScrollView>
        ) : (
          <View className="flex-1 items-center justify-center">
            <Light size={110} state={library ? "idle" : "thinking"} />
          </View>
        )}
        {hero.length > 1 && (
          <View className="absolute bottom-4 left-0 right-0 flex-row justify-center gap-1.5" pointerEvents="none">
            {hero.map((t, i) => (
              <View key={t.id} className={`h-1.5 rounded-full ${i === slide ? "w-4 bg-white" : "w-1.5 bg-white/45"}`} />
            ))}
          </View>
        )}

        {/* Header over the art */}
        <View className="absolute left-0 right-0 flex-row items-center justify-between px-5" style={{ top: insets.top + 8 }} pointerEvents="box-none">
          <Text className="font-display text-[34px] leading-10 text-white">Today</Text>
          <View className="flex-row gap-2.5">
            <GlassButton label="Search" onPress={() => router.push("/search")}>
              <SearchIcon size={20} color="#fff" />
            </GlassButton>
            <GlassButton label="Notifications and reminders" onPress={() => router.push("/notifications")}>
              <BellIcon size={20} color="#fff" />
            </GlassButton>
          </View>
        </View>
      </View>

      {/* The companion, one tap away */}
      {user?.aiEnabled && <AskCard />}

      {error && <Text className="mx-5 mt-4 font-sans text-sm text-danger">{error}</Text>}

      {/* Today's prayer and the week */}
      <View className="mx-4 mt-6 rounded-[28px] bg-card px-6 pb-6 pt-5">
        <View className="flex-row items-center justify-between">
          <Text className="font-sans-bold text-xs uppercase tracking-[2px] text-olive-deep">Today’s prayer</Text>
          <Light size={34} state={celebrating ? "speaking" : today ? "idle" : "thinking"} />
        </View>
        {today ? (
          <>
            <Text className="mt-1 font-display text-[24px] leading-8 text-ink">{today.prayer.title}</Text>
            <Text className="mt-2.5 font-serif text-[17px] leading-7 text-ink">{today.prayer.text}</Text>
            <View className="mt-5 items-center">
              {today.streak.prayedToday ? (
                <View className="flex-row items-center gap-2 rounded-full bg-sage px-5 py-3">
                  <CheckIcon size={16} color={c.onPastel} />
                  <Text className="font-sans-bold text-base text-on-pastel">Prayed today</Text>
                </View>
              ) : (
                <OliveButton label="Mark as prayed" onPress={pray} loading={marking} />
              )}
            </View>
          </>
        ) : !error ? (
          <Text className="mt-2 font-sans text-base text-muted">Getting today’s prayer…</Text>
        ) : (
          <View className="mt-3">
            <LineButton label="Try again" onPress={load} />
          </View>
        )}
        {streak && !streak.hidden && (
          <Pressable onPress={() => router.push("/streak")} accessibilityRole="button" className="mt-6 border-t border-line pt-5 active:opacity-80">
            <StreakWeek streak={streak} />
          </Pressable>
        )}
        {/* Only for someone already praying this week, so a brand-new account isn't offered a grace day */}
        {streak && !streak.hidden && streak.graceAvailable && streak.doneThisWeek.some(Boolean) && (
          <Pressable onPress={grace} accessibilityRole="button" className="mt-4 active:opacity-70">
            <Text className="font-sans text-sm leading-5 text-muted">
              Missed yesterday? <Text className="font-sans-bold text-olive-deep">Use this week’s grace day</Text>
            </Text>
          </Pressable>
        )}
      </View>

      {user && !user.reminderTime && (
        <View className="mx-4 mt-4 rounded-[28px] bg-sky px-6 py-5">
          <Text className="font-display text-[20px] leading-7 text-on-pastel">Want a gentle daily reminder?</Text>
          <Text className="mt-1 font-sans text-[15px] leading-6 text-on-pastel/80">
            One a day at {DEFAULT_REMINDER}, skipped once you’ve prayed. Change the time from the bell at the top.
          </Text>
          <Pressable onPress={turnOnReminders} accessibilityRole="button" className="mt-3 self-start rounded-full bg-ink px-5 py-2.5 active:opacity-80">
            <Text className="font-sans-bold text-sm text-bg">Remind me</Text>
          </Pressable>
        </View>
      )}

      <Shelf title="Recently prayed" tracks={recentTracks.slice(0, 10)} onMore={() => router.push({ pathname: "/list/[key]", params: { key: "recent" } })} />

      {trending.length >= 3 && (
        <Shelf title="Trending" tracks={trending} onMore={() => router.push({ pathname: "/list/[key]", params: { key: "trending" } })} />
      )}

      {shelves.slice(0, 2).map((s) => (
        <Shelf key={s.key} title={categoryTitle(s.key)} tracks={s.tracks} onMore={() => router.push({ pathname: "/list/[key]", params: { key: `c-${s.key}` } })} />
      ))}

      {/* Verse of the day as a quote */}
      {today && (
        <View className="mt-12 items-center px-8">
          <Text className="font-sans-semibold text-sm uppercase tracking-[2px] text-muted">
            {today.verse.ref} · {today.verse.translation}
          </Text>
          <Text className="mt-3 text-center font-serif text-[25px] leading-[36px] text-ink">“{today.verse.text.trim()}”</Text>
          <Pressable
            onPress={() => Share.share({ message: `“${today.verse.text.trim()}” ${today.verse.ref} (${today.verse.translation})` }).catch(reportError)}
            accessibilityRole="button"
            className="mt-5 items-center gap-1.5 active:opacity-70"
          >
            <View className="h-12 w-12 items-center justify-center rounded-full border-[1.5px] border-line2">
              <ShareIcon size={20} color={c.ink} />
            </View>
            <Text className="font-sans text-xs text-muted">Share verse</Text>
          </Pressable>
        </View>
      )}

      {shelves.slice(2).map((s) => (
        <Shelf key={s.key} title={categoryTitle(s.key)} tracks={s.tracks} onMore={() => router.push({ pathname: "/list/[key]", params: { key: `c-${s.key}` } })} />
      ))}

      {starters.length > 0 && (
        <View className="mt-8">
          <SectionTitle title="Not sure where to start?" />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            snapToInterval={width - 40 + 14}
            decelerationRate="fast"
            contentContainerStyle={{ gap: 14, paddingHorizontal: 20 }}
          >
            {starters.map((t, i) => (
              <TrackCard key={t.id} track={t} width={width - 40} aspect={1.45} seed={i + 11} />
            ))}
          </ScrollView>
        </View>
      )}

      <View className="mx-4 mt-12 items-center">
        <Light size={44} />
        <Text className="mt-3 text-center font-display text-[20px] leading-7 text-ink">Know someone who’d pray with you?</Text>
        <View className="mt-4 w-full">
          <LineButton label="Share Lumen" onPress={shareApp} icon={<ShareIcon size={18} color={c.ink} />} />
        </View>
      </View>
    </ScrollView>
  );
}

// Darkens the top (for the header) and the bottom (for the title) of the carousel art
function Shade({ height }: { height: number }) {
  return (
    <Svg style={{ position: "absolute", top: 0, left: 0 }} width="100%" height={height} pointerEvents="none">
      <Defs>
        <LinearGradient id="shade" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#000" stopOpacity="0.45" />
          <Stop offset="0.22" stopColor="#000" stopOpacity="0" />
          <Stop offset="0.55" stopColor="#000" stopOpacity="0" />
          <Stop offset="1" stopColor="#000" stopOpacity="0.65" />
        </LinearGradient>
      </Defs>
      <Rect x="0" y="0" width="100%" height="100%" fill="url(#shade)" />
    </Svg>
  );
}

function GlassButton({ label, onPress, children }: { label: string; onPress: () => void; children: ReactNode }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} hitSlop={6} className="h-11 w-11 items-center justify-center rounded-full bg-white/25 active:opacity-70">
      {children}
    </Pressable>
  );
}

// The companion, one tap away: a single card that opens a new conversation
function AskCard() {
  const c = useColors();
  const [starting, setStarting] = useState(false);

  const start = async () => {
    if (starting) return;
    setStarting(true);
    try {
      const id = await createConversation();
      router.push({ pathname: "/companion/[id]", params: { id } });
    } catch (err) {
      reportError(err);
      router.navigate("/companion");
    } finally {
      setStarting(false);
    }
  };

  return (
    <Pressable
      onPress={start}
      accessibilityRole="button"
      accessibilityLabel="Ask the companion"
      className="mx-4 mt-5 flex-row items-center gap-4 rounded-[28px] bg-lav px-5 py-5 active:opacity-85"
    >
      <Light size={48} state={starting ? "thinking" : "idle"} />
      <View className="flex-1">
        <Text className="font-display text-[20px] leading-7 text-on-pastel">Ask the companion</Text>
        <Text className="mt-0.5 font-sans text-[15px] leading-5 text-on-pastel/75">Questions on faith, answered from Scripture</Text>
      </View>
      {starting ? <ActivityIndicator color={c.onPastel} /> : <ChevronIcon size={20} color={c.onPastel} />}
    </Pressable>
  );
}
