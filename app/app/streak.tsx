import { useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Light } from "@/components/Light";
import { ScreenHeader } from "@/components/ScreenHeader";
import { BoltIcon, CheckIcon, ClockIcon, StarIcon } from "@/components/ui/icons";
import { useColors } from "@/components/ui/theme";
import { errorMessage } from "@/lib/api/client";
import { getJourney } from "@/lib/api/today";
import type { Journey } from "@/lib/api/types";
import { reportError } from "@/lib/errorReporting";

// Streak (opened from Me and from the week on Home): this week, totals, the last 8 weeks against the goal, and a
// calendar of every day prayed. The streak is soft (SPEC §6.5): missed days never reset anything.

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];

export default function StreakScreen() {
  const insets = useSafeAreaInsets();
  const c = useColors();
  const [journey, setJourney] = useState<Journey | null>(null);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      getJourney().then(
        (j) => {
          setJourney(j);
          setError(null);
        },
        (err) => {
          reportError(err);
          setError(errorMessage(err));
        },
      );
    }, []),
  );

  const thisWeek = journey?.weeks[journey.weeks.length - 1];
  const weeksMet = journey?.weeks.filter((w) => w.done >= w.goal).length ?? 0;
  const tallest = Math.max(7, ...(journey?.weeks.map((w) => w.goal) ?? []));

  return (
    <View className="flex-1 bg-bg">
      <ScreenHeader title="" fallback="/me" />
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}>
        <Text className="px-5 font-display text-[34px] leading-10 text-ink">Streak</Text>
        {error && <Text className="mx-5 mt-3 font-sans text-sm text-danger">{error}</Text>}

        {!journey ? (
          !error && (
            <View className="mt-10 items-center">
              <Light size={56} state="thinking" />
            </View>
          )
        ) : (
          <>
            <View className="mt-5 flex-row flex-wrap gap-y-6 px-5">
              <Stat icon={<BoltIcon size={18} color={c.onPastel} filled />} tint={c.lav} value={`${thisWeek!.done}/${thisWeek!.goal}`} label="This week" />
              <Stat icon={<StarIcon size={18} color={c.onPastel} filled />} tint={c.butter} value={String(weeksMet)} label="Goals met · 8 wks" />
              <Stat icon={<CheckIcon size={18} color={c.onPastel} />} tint={c.sage} value={String(journey.totals.daysPrayed)} label="Days prayed" />
              <Stat icon={<ClockIcon size={18} color={c.onPastel} />} tint={c.sky} value={String(journey.totals.prayers)} label="Guided prayers" />
            </View>

            <View className="mx-4 mt-8 rounded-[28px] bg-card px-6 py-5">
              <Text className="font-sans-bold text-xs uppercase tracking-[2px] text-olive-deep">Last 8 weeks</Text>
              <Text className="mt-1 font-sans text-sm text-muted">
                {thisWeek!.done >= thisWeek!.goal ? "This week’s goal is reached. Well done." : "Missed days never reset anything."}
              </Text>
              {/* Oldest first */}
              <View className="mt-5 h-28 flex-row items-end justify-between">
                {journey.weeks.map((w, i) => {
                  const current = i === journey.weeks.length - 1;
                  return (
                    <View key={w.start} className="flex-1 items-center gap-1.5">
                      <View className="h-24 w-6 justify-end overflow-hidden rounded-full bg-line">
                        <View
                          className={`w-full rounded-full ${w.done >= w.goal ? "bg-olive" : current ? "bg-olive-deep/60" : "bg-olive/60"}`}
                          style={{ height: `${Math.min(100, (w.done / tallest) * 100)}%` }}
                        />
                      </View>
                      <Text className={`font-sans text-[10px] ${current ? "font-sans-bold text-olive-deep" : "text-muted"}`}>
                        {current ? "Now" : new Date(`${w.start}T12:00:00`).toLocaleDateString("en-US", { month: "numeric", day: "numeric" })}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>

            {journey.days && journey.today && <Calendar days={journey.days} today={journey.today} />}
          </>
        )}
      </ScrollView>
    </View>
  );
}

function Stat({ icon, tint, value, label }: { icon: React.ReactNode; tint: string; value: string; label: string }) {
  return (
    <View className="w-1/2 pr-3">
      <View className="h-9 w-9 items-center justify-center rounded-full" style={{ backgroundColor: tint }}>
        {icon}
      </View>
      <Text className="mt-2 font-display text-[40px] leading-[46px] text-ink">{value}</Text>
      <View className="mt-1 self-start rounded-md px-2 py-1" style={{ backgroundColor: tint }}>
        <Text className="font-sans-semibold text-xs uppercase tracking-[1px] text-on-pastel">{label}</Text>
      </View>
    </View>
  );
}

// "Prayer activity": this month and the five before it, newest first, Sunday-first rows of dots
function Calendar({ days, today }: { days: { date: string; grace: boolean }[]; today: string }) {
  const c = useColors();
  const prayed = useMemo(() => new Map(days.map((d) => [d.date, d.grace])), [days]);
  const months = useMemo(() => {
    const [y, m] = today.split("-").map(Number);
    return Array.from({ length: 6 }, (_, i) => {
      const total = y * 12 + (m - 1) - i;
      const year = Math.floor(total / 12);
      const month = total % 12; // 0-based
      return { year, month, first: new Date(Date.UTC(year, month, 1)).getUTCDay(), count: new Date(Date.UTC(year, month + 1, 0)).getUTCDate() };
    });
  }, [today]);

  return (
    <View className="mx-4 mt-8 rounded-[28px] bg-card px-5 py-5">
      <Text className="font-sans-bold text-xs uppercase tracking-[2px] text-olive-deep">Prayer activity</Text>
      <View className="mt-4 flex-row">
        {WEEKDAYS.map((d, i) => (
          <Text key={i} className="flex-1 text-center font-sans-semibold text-xs text-muted">
            {d}
          </Text>
        ))}
      </View>
      {months.map(({ year, month, first, count }) => {
        const cells = [...Array.from({ length: first }, () => null), ...Array.from({ length: count }, (_, i) => i + 1)];
        return (
          <View key={`${year}-${month}`} className="mt-5">
            <Text className="mb-2 text-center font-sans-bold text-sm text-ink">
              {new Date(Date.UTC(year, month, 1)).toLocaleDateString("en-US", { month: "long", year: today.startsWith(String(year)) ? undefined : "numeric", timeZone: "UTC" })}
            </Text>
            <View className="flex-row flex-wrap">
              {cells.map((day, i) => {
                if (!day) return <View key={`e${i}`} style={{ width: `${100 / 7}%` }} />;
                const date = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                const grace = prayed.get(date);
                const done = grace !== undefined;
                const future = date > today;
                return (
                  <View key={date} style={{ width: `${100 / 7}%` }} className="items-center py-1.5" accessibilityLabel={`${date}${done ? ", prayed" : ""}`}>
                    <View
                      className="h-7 w-7 items-center justify-center rounded-full"
                      style={{
                        backgroundColor: done ? (grace ? c.gold : c.olive) : "transparent",
                        borderWidth: date === today && !done ? 1.5 : 0,
                        borderColor: c.oliveDeep,
                      }}
                    >
                      {done ? (
                        <Text className="font-sans-bold text-[11px] text-on-pastel">{day}</Text>
                      ) : (
                        <View className="h-2 w-2 rounded-full" style={{ backgroundColor: future ? "transparent" : c.line }} />
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        );
      })}
    </View>
  );
}
