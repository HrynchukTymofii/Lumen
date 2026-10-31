import { Text, View } from "react-native";
import type { Streak } from "@/lib/api/types";
import { CheckIcon } from "./ui/icons";
import { useColors } from "./ui/theme";

// Soft streak (SPEC §6.5): Mon–Sun dots, filled for days prayed, "4 of 5 days this week". Nothing resets.
const LETTERS = ["M", "T", "W", "T", "F", "S", "S"];

export function StreakWeek({ streak }: { streak: Streak }) {
  const c = useColors();
  const done = streak.doneThisWeek.filter(Boolean).length;
  const reached = done >= streak.goal;
  return (
    <View>
      <Text className="font-sans-bold text-base text-ink">
        {reached ? `Week complete: ${done} of ${streak.goal} days` : `${done} of ${streak.goal} days this week`}
      </Text>
      <View className="mt-3 flex-row justify-between">
        {streak.weekDays.map((day, i) => {
          const isDone = streak.doneThisWeek[i];
          const isToday = day === streak.today;
          return (
            <View key={day} className="items-center gap-1.5">
              <View
                className={`h-9 w-9 items-center justify-center rounded-full ${
                  isDone ? (streak.graceDays[i] ? "bg-gold" : "bg-olive") : isToday ? "border-[1.5px] border-olive-deep" : "bg-line"
                }`}
              >
                {isDone && <CheckIcon size={15} color={c.onPastel} />}
              </View>
              <Text className={`font-sans-bold text-xs ${isToday ? "text-olive-deep" : "text-muted"}`}>{LETTERS[i]}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}
