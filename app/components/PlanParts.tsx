import { Pressable, Text, View } from "react-native";
import { APP_NAME } from "@/lib/config";
import { requestPermission } from "@/lib/notifications";
import type { Plan } from "@/lib/readingPlans";
import { Scene } from "./Scene";
import { ChevronIcon } from "./ui/icons";
import { useColors } from "./ui/theme";

// Pieces shared by the reading-plan screens (app/plans).

export const REMINDER_TIMES = [
  { value: "07:00", label: "Morning · 7:00" },
  { value: "12:30", label: "Midday · 12:30" },
  { value: "20:00", label: "Evening · 20:00" },
] as const;

/** The reminder time picker: three times or none. Picking a time asks for notification permission first. */
export function ReminderPicker({
  value,
  onChange,
  setError,
  onCard,
}: {
  value: string | null;
  onChange: (v: string | null) => void;
  setError: (e: string | null) => void;
  /** On a grey card the unpicked times are white, so they still read as buttons */
  onCard?: boolean;
}) {
  const pick = async (time: string | null) => {
    setError(null);
    if (time && !(await requestPermission())) {
      setError(`Notifications are off for ${APP_NAME}. You can allow them in your phone’s settings.`);
      return;
    }
    onChange(time);
  };
  return (
    <View className="flex-row flex-wrap gap-2">
      {[...REMINDER_TIMES, { value: null, label: "No reminder" }].map((o) => {
        const on = value === o.value;
        return (
          <Pressable
            key={o.label}
            onPress={() => pick(o.value)}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            className={`h-10 justify-center rounded-full px-4 active:opacity-80 ${on ? "bg-ink" : onCard ? "bg-bg" : "bg-card"}`}
          >
            <Text className={`font-sans text-[15px] ${on ? "text-bg" : "text-ink"}`}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** A plan in the list: its landscape, title, one line and length */
export function PlanRow({ plan, onPress, note }: { plan: Plan; onPress: () => void; note?: string }) {
  const c = useColors();
  return (
    <Pressable onPress={onPress} accessibilityRole="button" className="flex-row items-center gap-4 py-2 active:opacity-80">
      <View className="h-[76px] w-[76px] overflow-hidden rounded-2xl bg-card">
        <Scene name={plan.scene} options={{ seed: plan.days, noBigTrees: true }} />
      </View>
      <View className="flex-1">
        <Text className="font-sans-semibold text-[16px] text-ink" numberOfLines={1}>
          {plan.title}
        </Text>
        <Text className="mt-0.5 font-sans text-sm text-muted" numberOfLines={2}>
          {plan.blurb}
        </Text>
        <Text className="mt-0.5 font-sans text-[13px] text-dim">{note ?? `${plan.days} days`}</Text>
      </View>
      <ChevronIcon size={18} color={c.dim} />
    </Pressable>
  );
}

/** A thin progress bar */
export function Progress({ value }: { value: number }) {
  return (
    <View className="h-2 overflow-hidden rounded-full bg-line">
      <View className="h-full rounded-full bg-gold" style={{ width: `${Math.max(2, Math.min(100, value * 100))}%` }} />
    </View>
  );
}
