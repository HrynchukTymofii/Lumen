import { Text, View } from "react-native";
import type { Streak } from "@/lib/api/types";
import { CheckIcon } from "./ui/icons";
import { useColors } from "./ui/theme";

// Soft streak (SPEC §6.5): "4 days prayed this week" with the weekly goal beside it, then Mon–Sun circles, glowing gold
// for days prayed. The count is out of the week's 7 days; the goal (3–7, Settings) is shown apart so "4 of 5" never
// sits next to seven circles. Nothing resets.
const LETTERS = ["M", "T", "W", "T", "F", "S", "S"];

export function StreakWeek({ streak, dark }: { streak: Streak; dark?: boolean }) {
  const c = useColors();
  const done = streak.doneThisWeek.filter(Boolean).length;
  const reached = done >= streak.goal;
  return (
    <View>
      <View className="flex-row items-baseline justify-between">
        <Text className={`font-display text-[18px] ${dark ? "text-bg" : "text-ink"}`}>
          {done === 0 ? "Your week" : `${done} ${done === 1 ? "day" : "days"} prayed this week`}
        </Text>
        <Text className={`font-sans text-sm ${dark ? "text-bg/60" : "text-muted"}`}>{reached ? "Goal reached" : `Goal: ${streak.goal} a week`}</Text>
      </View>
      <View className="mt-4 flex-row justify-between">
        {streak.weekDays.map((day, i) => {
          const isDone = streak.doneThisWeek[i];
          const isToday = day === streak.today;
          return (
            <View key={day} className="items-center gap-2">
              <Text className={`font-sans text-xs ${dark ? (isToday ? "text-bg" : "text-bg/55") : isToday ? "text-ink" : "text-muted"}`}>{LETTERS[i]}</Text>
              <View
                className={`h-9 w-9 items-center justify-center rounded-full ${
                  isDone ? "bg-gold" : isToday ? (dark ? "border-2 border-bg" : "border-2 border-ink") : dark ? "bg-bg/15" : "bg-line"
                }`}
              >
                {isDone && <CheckIcon size={15} color={c.onPastel} />}
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}
