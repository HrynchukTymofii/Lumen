import { router } from "expo-router";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Share, Text, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BottomShade } from "@/components/ArtTile";
import { Light } from "@/components/Light";
import { StreakWeek } from "@/components/StreakWeek";
import { SectionTitle, Shelf } from "@/components/TrackCard";
import { TrackArt } from "@/components/TrackArt";
import { InkButton, OliveButton } from "@/components/ui/Button";
import { ArrowIcon, BellIcon, BibleIcon, CheckIcon, ChevronIcon, LockIcon, PlayIcon, SearchIcon } from "@/components/ui/icons";
import { useColors } from "@/components/ui/theme";
import { useAuth } from "@/context/AuthContext";
import { askToSignIn, hasAccount } from "@/lib/account";
import { createConversation } from "@/lib/api/chat";
import { errorMessage } from "@/lib/api/client";
import { cachedLibrary, getLibrary, getTrending } from "@/lib/api/library";
import { applyGrace, getToday, markPrayed } from "@/lib/api/today";
import type { Library, Streak, Today, Track } from "@/lib/api/types";
import { track as trackEvent } from "@/lib/analytics";
import { companionTopic, type CompanionTopic } from "@/lib/companionTopics";
import { refreshPlanReminders } from "@/lib/planActions";
import { dayChapters, nextDay, planById, readingLabel, readingMinutes, usePlanProgress } from "@/lib/readingPlans";
import { APP_NAME } from "@/lib/config";
import { reportError } from "@/lib/errorReporting";
import { requestPermission, scheduleReminders } from "@/lib/notifications";
import { categoryTitle, openTrack, playTrack, shareApp, trackMinutes } from "@/lib/play";
import { pick, useRecent } from "@/lib/userLibrary";

// Home (the "Home · Option B (Expressive style)" frames, light and dark · warm): a big greeting (no logo: it's the app), picture
// cards of prayers to start with one tap, topic chips, the week and the verse of the day side by side, "Talk it
// through" with the companion, today's written prayer, then shelves of prayers.
// Loading it also re-schedules the daily reminders (lib/notifications.ts).

const DEFAULT_REMINDER = "07:30";

// Which categories lead, by time of day
function categoryOrder(hour: number) {
  if (hour >= 20 || hour < 4) return ["sleep", "evening", "psalms", "peace", "grief", "family", "morning"];
  if (hour >= 17) return ["evening", "psalms", "peace", "sleep", "grief", "family", "morning"];
  return ["morning", "psalms", "peace", "family", "grief", "evening", "sleep"];
}

const dayNumber = () => Math.floor((Date.now() - new Date().getTimezoneOffset() * 60_000) / 86_400_000);

// Up to five prayers for the cards: ones with audio first, the time of day's category first, rotating daily
function featured(tracks: Track[], hour: number) {
  const order = categoryOrder(hour);
  const playable = tracks.filter((t) => t.variants.some((v) => v.url) || t.locked);
  const pool = (playable.length ? playable : tracks).slice();
  const shift = pool.length ? dayNumber() % pool.length : 0;
  const rotated = [...pool.slice(shift), ...pool.slice(0, shift)];
  return rotated.sort((a, b) => order.indexOf(a.category) - order.indexOf(b.category)).slice(0, 5);
}

const greeting = (hour: number) => (hour >= 4 && hour < 12 ? "Good morning" : hour >= 12 && hour < 17 ? "Good afternoon" : "Good evening");
const momentLabel = (hour: number) =>
  hour >= 4 && hour < 12 ? "For this morning" : hour >= 12 && hour < 17 ? "For this afternoon" : hour >= 17 && hour < 21 ? "For this evening" : "For tonight";

// Short chip names: "Peace & calm" → "Peace"
const CHIP_TITLES: Record<string, string> = { morning: "Morning", evening: "Evening", peace: "Peace", psalms: "Scripture", grief: "Grief", family: "Family", sleep: "Sleep" };
const chipTitle = (k: string) => CHIP_TITLES[k] ?? categoryTitle(k);

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
  // The topic chip: null is "For you"
  const [chip, setChip] = useState<string | null>(null);
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
    // Keeps the next week of Bible-reading reminders scheduled (lib/planActions.ts)
    refreshPlanReminders().catch(reportError);
  }, [load]);

  // Keeps the next week of reminders scheduled, without today's once it's prayed
  const prayedToday = today?.streak?.prayedToday;
  useEffect(() => {
    if (!user || prayedToday === undefined) return;
    scheduleReminders({ time: user.reminderTime, enabled: user.remindersEnabled, prayedToday, name: user.firstName }).catch(reportError);
  }, [user, prayedToday]);

  const setStreak = (streak: Streak) => setToday((t) => (t ? { ...t, streak } : t));

  // The prayer week lives on the account
  const pray = async () => {
    if (!hasAccount()) return askToSignIn("streak");
    setMarking(true);
    try {
      setStreak(await markPrayed());
      trackEvent("prayer_marked_done", { prayer_type: "today_button" });
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
      setError(`Notifications are off for ${APP_NAME}. You can allow them in your phone’s settings.`);
      return;
    }
    updateProfile({ reminderTime: DEFAULT_REMINDER, remindersEnabled: true }).catch((err) => setError(errorMessage(err)));
  };

  const hour = new Date().getHours();
  const tracks = useMemo(() => library?.tracks ?? [], [library]);
  const recentTracks = useMemo(() => pick(tracks, recent.map((r) => r.id)), [tracks, recent]);
  const trending = useMemo(() => pick(tracks, trendingIds), [tracks, trendingIds]);
  const shelves = useMemo(
    () =>
      categoryOrder(hour)
        .map((key) => ({ key, tracks: tracks.filter((t) => t.category === key) }))
        .filter((s) => s.tracks.length),
    [tracks, hour],
  );
  const categories = shelves.map((s) => s.key);
  // The chip picks what the big cards and "Pray anytime" show
  const chipTracks = useMemo(() => (chip ? tracks.filter((t) => t.category === chip) : null), [tracks, chip]);
  const cards = useMemo(() => featured(chipTracks ?? tracks, hour), [chipTracks, tracks, hour]);
  // Without a chip: short, free prayers first, good for someone new
  const anytime = useMemo(
    () =>
      chipTracks ??
      tracks
        .filter((t) => !t.locked)
        .sort((a, b) => Math.min(...a.variants.map((v) => v.minutes)) - Math.min(...b.variants.map((v) => v.minutes)))
        .slice(0, 10),
    [chipTracks, tracks],
  );
  const streak = today?.streak;
  const cardWidth = width - 32;
  const cardHeight = Math.min(Math.round(cardWidth * 1.14), Math.round(height * 0.56));
  const name = user?.firstName?.trim();

  return (
    <ScrollView
      className="flex-1 bg-bg"
      contentContainerStyle={{ paddingTop: insets.top + 10, paddingBottom: 28 }}
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
      {/* Header: the greeting, with search and reminders next to it */}
      <View className="mt-2 flex-row items-start justify-between gap-3 px-4">
        <Text accessibilityRole="header" className="flex-1 font-display text-[32px] text-ink" style={{ lineHeight: 37, letterSpacing: -1.1 }}>
          {greeting(hour)}
          {name ? `,\n${name}.` : "."}
        </Text>
        <View className="mt-1 flex-row gap-2">
          <RoundButton label="Search" onPress={() => router.push("/search")}>
            <SearchIcon size={19} color={c.ink} />
          </RoundButton>
          <RoundButton label="Notifications and reminders" onPress={() => router.push("/notifications")}>
            <BellIcon size={19} color={c.ink} />
          </RoundButton>
        </View>
      </View>

      {/* Prayers to start with one tap: big picture cards */}
      <View className="mt-6" style={{ height: cardHeight }}>
        {cards.length ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            snapToInterval={cardWidth + 12}
            decelerationRate="fast"
            contentContainerStyle={{ gap: 12, paddingHorizontal: 16 }}
          >
            {cards.map((t, i) => (
              <Pressable
                key={t.id}
                onPress={() => playTrack(t)}
                accessibilityRole="button"
                accessibilityLabel={`Play ${t.title}`}
                className="overflow-hidden rounded-[32px] bg-card active:opacity-90"
                style={{ width: cardWidth, height: cardHeight }}
              >
                <TrackArt imageUrl={t.imageUrl} scene={t.scene} options={{ seed: i + 7 }} />
                <BottomShade strength={0.7} />
                <View className="absolute left-4 top-4 rounded-full bg-black/45 px-3.5 py-1.5">
                  <Text className="font-sans text-[13px] text-white">{i === 0 && !chip ? momentLabel(hour) : categoryTitle(t.category)}</Text>
                </View>
                <View className="absolute bottom-0 left-0 right-0 flex-row items-end gap-3 px-6 pb-6">
                  <View className="flex-1">
                    <Text className="font-display text-[31px] text-white" style={{ lineHeight: 34, letterSpacing: -1 }} numberOfLines={3}>
                      {t.title}
                    </Text>
                    <Text className="mt-2 font-sans text-sm text-white/85" numberOfLines={1}>
                      {t.locked ? "Premium" : trackMinutes(t)} · {chipTitle(t.category)}
                      {t.subtitle ? ` · ${t.subtitle}` : ""}
                    </Text>
                  </View>
                  <View className="h-14 w-14 items-center justify-center rounded-full bg-white">
                    <PlayIcon size={22} color="#0E0E10" />
                  </View>
                </View>
              </Pressable>
            ))}
          </ScrollView>
        ) : (
          <View className="mx-4 flex-1 items-center justify-center rounded-[32px] bg-card">
            <Light size={96} state={library ? "idle" : "thinking"} />
          </View>
        )}
      </View>

      {/* What you're praying about */}
      {categories.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-5" contentContainerStyle={{ gap: 8, paddingHorizontal: 16 }}>
          {[null, ...categories].map((k) => {
            const on = chip === k;
            return (
              <Pressable
                key={k ?? "for-you"}
                onPress={() => setChip(k)}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                className={`h-10 justify-center rounded-full px-4 active:opacity-80 ${on ? "bg-ink" : "bg-card"}`}
              >
                <Text className={`font-sans text-[15px] ${on ? "text-bg" : "text-ink"}`}>{k ? chipTitle(k) : "For you"}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      )}

      {error && <Text className="mx-4 mt-4 font-sans text-sm text-danger">{error}</Text>}

      {/* The week, then the verse of the day */}
      <Pressable
        onPress={() => (streak ? router.push("/streak") : askToSignIn("streak"))}
        accessibilityRole="button"
        accessibilityLabel="Your prayer week"
        className="mx-4 mt-5 rounded-[28px] bg-ink p-5 active:opacity-90"
      >
        {streak && !streak.hidden ? (
          <StreakWeek streak={streak} dark />
        ) : (
          <View className="flex-row items-center gap-3">
            <Light size={40} />
            <View className="flex-1">
              <Text className="font-display text-[18px] text-bg">Start your week of prayer</Text>
              <Text className="mt-0.5 font-sans text-sm text-bg/65">Pray a few days a week and watch them fill up here.</Text>
            </View>
          </View>
        )}
      </Pressable>
      <Pressable
        onPress={() => today && Share.share({ message: `“${today.verse.text.trim()}” ${today.verse.ref} (${today.verse.translation})` }).catch(reportError)}
        accessibilityRole="button"
        accessibilityLabel="Share the verse of the day"
        className="mx-4 mt-4 rounded-[28px] bg-card p-5 active:opacity-90"
      >
        <Text className="font-sans text-sm text-muted">Verse of the day</Text>
        {today ? (
          <>
            <Text className="mt-2 font-display text-[20px] text-ink" style={{ lineHeight: 26, letterSpacing: -0.4 }}>
              “{today.verse.text.trim()}”
            </Text>
            <Text className="mt-3 font-sans text-sm text-muted">{today.verse.ref}</Text>
          </>
        ) : (
          <View className="py-4">
            <ActivityIndicator color={c.muted} />
          </View>
        )}
      </Pressable>

      {/* Today's Bible reading, or an invitation to start a plan */}
      <ReadingCard />

      {/* The companion, one tap away */}
      {(!user || user.aiEnabled) && <TalkCard topic={companionTopic(user)} />}

      {/* Today's written prayer and the grace day */}
      <View className="mx-4 mt-4 rounded-[28px] bg-card p-5">
        <View className="flex-row items-center justify-between">
          <Text className="font-sans text-sm text-muted">Written for you today</Text>
          <Light size={30} state={celebrating ? "speaking" : today ? "idle" : "thinking"} />
        </View>
        {today ? (
          <>
            <Text className="mt-1 font-display text-[24px] text-ink" style={{ lineHeight: 29, letterSpacing: -0.6 }}>
              {today.prayer.title}
            </Text>
            <Text className="mt-2.5 font-serif text-[17px] leading-7 text-ink">{today.prayer.text}</Text>
            <View className="mt-5 items-start">
              {today.streak?.prayedToday ? (
                <View className="flex-row items-center gap-2 rounded-full bg-bg px-5 py-3">
                  <CheckIcon size={16} color={c.ink} />
                  <Text className="font-sans-semibold text-base text-ink">Prayed today</Text>
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
            <InkButton label="Try again" onPress={load} />
          </View>
        )}
        {/* Only for someone already praying this week, so a brand-new account isn't offered a grace day */}
        {streak && !streak.hidden && streak.graceAvailable && streak.doneThisWeek.some(Boolean) && (
          <Pressable onPress={grace} accessibilityRole="button" className="mt-4 active:opacity-70">
            <Text className="font-sans text-sm leading-5 text-muted">
              Missed yesterday? <Text className="font-sans-semibold text-ink underline">Use this week’s grace day</Text>
            </Text>
          </Pressable>
        )}
      </View>

      {user && !user.reminderTime && (
        <View className="mx-4 mt-4 rounded-[28px] bg-card p-5">
          <Text className="font-display text-[20px] leading-7 text-ink">Want a gentle daily reminder?</Text>
          <Text className="mt-1 font-sans text-[15px] leading-6 text-muted">
            One a day at {DEFAULT_REMINDER}, skipped once you’ve prayed. Change the time from the bell at the top.
          </Text>
          <Pressable onPress={turnOnReminders} accessibilityRole="button" className="mt-3 self-start rounded-full bg-ink px-5 py-2.5 active:opacity-80">
            <Text className="font-sans-semibold text-sm text-bg">Remind me</Text>
          </Pressable>
        </View>
      )}

      {/* Pray anytime: tall picture cards with the title over the art */}
      {anytime.length > 0 && (
        <View className="mt-9">
          <SectionTitle
            title={chip ? chipTitle(chip) : "Pray anytime"}
            onPress={chip ? () => router.push({ pathname: "/list/[key]", params: { key: `c-${chip}` } }) : undefined}
          />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingHorizontal: 16 }}>
            {anytime.map((t, i) => (
              <PosterCard key={t.id} track={t} seed={i + 3} />
            ))}
          </ScrollView>
        </View>
      )}

      <Shelf title="Recently prayed" tracks={recentTracks.slice(0, 10)} onMore={() => router.push({ pathname: "/list/[key]", params: { key: "recent" } })} />

      {trending.length >= 3 && (
        <Shelf title="Trending" tracks={trending} onMore={() => router.push({ pathname: "/list/[key]", params: { key: "trending" } })} />
      )}

      {!chip &&
        shelves.map((s) => (
          <Shelf key={s.key} title={categoryTitle(s.key)} tracks={s.tracks} onMore={() => router.push({ pathname: "/list/[key]", params: { key: `c-${s.key}` } })} />
        ))}

      <View className="mx-4 mt-10 items-center rounded-[28px] bg-card px-5 pb-5 pt-6">
        <Light size={44} />
        <Text className="mt-3 text-center font-display text-[20px] leading-7 text-ink">Know someone who’d pray with you?</Text>
        <View className="mt-4 w-full">
          <InkButton label={`Share ${APP_NAME}`} onPress={shareApp} />
        </View>
      </View>
    </ScrollView>
  );
}

// Today's reading of the plan in progress; without a plan, a quiet invitation to start one
function ReadingCard() {
  const c = useColors();
  const progress = usePlanProgress();
  const plan = progress ? planById(progress.planId) : undefined;
  const day = progress && plan ? nextDay(plan, progress) : null;

  if (!progress || !plan || day === null) {
    return (
      <Pressable
        onPress={() => router.push("/plans")}
        accessibilityRole="button"
        className="mx-4 mt-4 flex-row items-center gap-4 rounded-[28px] bg-card p-5 active:opacity-90"
      >
        <View className="h-12 w-12 items-center justify-center rounded-full bg-bg">
          <BibleIcon size={22} color={c.ink} />
        </View>
        <View className="flex-1">
          <Text className="font-display text-[18px] text-ink">Read the Bible every day</Text>
          <Text className="mt-0.5 font-sans text-sm text-muted">Start a reading plan, a few minutes a day</Text>
        </View>
        <ChevronIcon size={18} color={c.dim} />
      </Pressable>
    );
  }

  const chapters = dayChapters(plan, day);
  const doneToday = progress.lastDoneOn === todayKey();
  return (
    <Pressable onPress={() => router.push("/plans")} accessibilityRole="button" className="mx-4 mt-4 rounded-[28px] bg-card p-5 active:opacity-90">
      <View className="flex-row items-center justify-between">
        <Text className="font-sans text-sm text-muted">
          {doneToday ? "Read today · up next" : "Today’s reading"} · day {day + 1} of {plan.days}
        </Text>
        <BibleIcon size={18} color={c.muted} />
      </View>
      <Text className="mt-1.5 font-display text-[22px] text-ink" style={{ lineHeight: 27, letterSpacing: -0.5 }}>
        {readingLabel(chapters)}
      </Text>
      <Text className="mt-1 font-sans text-sm text-muted">
        {plan.title} · about {readingMinutes(plan, chapters)} min
      </Text>
      <View className="mt-4 h-1.5 overflow-hidden rounded-full bg-line">
        <View className="h-full rounded-full bg-gold" style={{ width: `${Math.max(2, (progress.done.length / plan.days) * 100)}%` }} />
      </View>
    </Pressable>
  );
}

const todayKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

function RoundButton({ label, onPress, children }: { label: string; onPress: () => void; children: ReactNode }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} hitSlop={6} className="h-10 w-10 items-center justify-center rounded-full bg-card active:opacity-70">
      {children}
    </Pressable>
  );
}

// "Pray anytime": a tall picture card, title and length in white over the art
function PosterCard({ track, seed }: { track: Track; seed: number }) {
  return (
    <Pressable
      onPress={() => openTrack(track)}
      accessibilityRole="button"
      accessibilityLabel={`${track.title}${track.locked ? ", Premium" : ""}`}
      className="overflow-hidden rounded-[26px] bg-card active:opacity-85"
      style={{ width: 150, height: 200 }}
    >
      <TrackArt imageUrl={track.imageUrl} scene={track.scene} options={{ seed, noBigTrees: true }} />
      <BottomShade strength={0.65} />
      {track.locked && (
        <View className="absolute right-2.5 top-2.5 h-7 w-7 items-center justify-center rounded-full bg-black/45">
          <LockIcon size={13} color="#fff" />
        </View>
      )}
      <View className="absolute bottom-0 left-0 right-0 px-3.5 pb-3.5">
        <Text className="font-display text-[16px] leading-5 text-white" numberOfLines={2}>
          {track.title}
        </Text>
        <Text className="mt-0.5 font-sans text-[13px] text-white/80">{trackMinutes(track)}</Text>
      </View>
    </Pressable>
  );
}

// "Talk it through": one big sentence for what they're carrying (lib/companionTopics.ts) on the Light's warm glow,
// so it stands apart from the grey cards. Tapping it opens a new conversation (or sign-in, without an account).
function TalkCard({ topic }: { topic: CompanionTopic }) {
  const c = useColors();
  const [starting, setStarting] = useState(false);

  const start = async () => {
    if (starting) return;
    if (!hasAccount()) return askToSignIn("companion");
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
      accessibilityLabel={`${topic.line[0]} ${topic.line[1]} Talk with the companion`}
      className="mx-4 mt-4 overflow-hidden rounded-[28px] bg-gold px-6 pb-6 pt-5 active:opacity-90"
    >
      <View className="flex-row items-start justify-between">
        <Light size={52} state={starting ? "thinking" : "idle"} />
        <View className="h-11 w-11 items-center justify-center rounded-full bg-on-pastel">
          {starting ? <ActivityIndicator color={c.gold} /> : <ArrowIcon size={18} color={c.gold} />}
        </View>
      </View>
      <Text className="mt-3 font-display text-[30px] text-on-pastel" style={{ lineHeight: 34, letterSpacing: -1 }}>
        {topic.line[0]}{" "}
        <Text className="font-serif text-[28px]" style={{ letterSpacing: -0.3 }}>
          {topic.line[1]}
        </Text>
      </Text>
    </Pressable>
  );
}
