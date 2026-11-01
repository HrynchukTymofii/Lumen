import { router, type Href } from "expo-router";
import { useState, type ReactNode } from "react";
import { Pressable, Switch, Text, View } from "react-native";
import { useAuth } from "@/context/AuthContext";
import { errorMessage } from "@/lib/api/client";
import type { ProfilePatch } from "@/lib/api/types";
import { reportError } from "@/lib/errorReporting";
import { requestPermission } from "@/lib/notifications";
import { ChevronIcon } from "./ui/icons";
import { useColors } from "./ui/theme";

// Pieces of the Settings screens (app/settings/*) and the reminder controls also shown behind Home's bell.

export const DEFAULT_REMINDER = "07:30";

/** Saves one profile change right away (PATCH /api/me); errors land in `error` */
export function useSaveProfile() {
  const { updateProfile } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const save = (patch: ProfilePatch) => {
    setError(null);
    updateProfile(patch).catch((err) => {
      reportError(err);
      setError(errorMessage(err));
    });
  };
  return { save, error, setError };
}

export function Section({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <View className="mx-4 mt-5">
      {title && <Text className="mb-2 px-1 font-sans-bold text-xs uppercase tracking-[2px] text-muted">{title}</Text>}
      <View className="rounded-[24px] bg-card px-5 py-5">{children}</View>
    </View>
  );
}

/** A big menu row, like Hallow's settings list */
export function MenuRow({ label, hint, href, onPress, danger }: { label: string; hint?: string; href?: Href; onPress?: () => void; danger?: boolean }) {
  const c = useColors();
  return (
    <Pressable
      onPress={onPress ?? (() => href && router.push(href))}
      accessibilityRole="button"
      className="flex-row items-center px-5 py-[18px] active:opacity-70"
    >
      <View className="flex-1">
        <Text className={`font-sans-bold text-[17px] ${danger ? "text-danger" : "text-ink"}`}>{label}</Text>
        {hint && <Text className="mt-0.5 font-sans text-sm text-muted">{hint}</Text>}
      </View>
      <ChevronIcon color={c.dim} />
    </Pressable>
  );
}

export function Toggle({ label, hint, value, onChange }: { label: string; hint?: string; value: boolean; onChange: (v: boolean) => void }) {
  const c = useColors();
  return (
    <View className="flex-row items-center gap-4">
      <View className="flex-1">
        <Text className="font-sans-bold text-base text-ink">{label}</Text>
        {hint && <Text className="mt-0.5 font-sans text-sm leading-5 text-muted">{hint}</Text>}
      </View>
      <Switch value={value} onValueChange={onChange} trackColor={{ true: c.oliveDeep, false: c.line }} accessibilityLabel={label} />
    </View>
  );
}

export function Chips<T extends string>({ options, value, onChange }: { options: { value: T; label: string }[]; value: T | null; onChange: (v: T) => void }) {
  return (
    <View className="mt-2 flex-row flex-wrap gap-2">
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable
            key={o.value}
            onPress={() => onChange(o.value)}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            className={`rounded-full border-[1.5px] px-4 py-2 ${on ? "border-ink bg-ink" : "border-line2"}`}
          >
            <Text className={`font-sans-bold text-sm ${on ? "text-bg" : "text-ink"}`}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// "07:30" ± 15 minutes, wrapping around midnight
function shiftTime(time: string, minutes: number) {
  const [h, m] = time.split(":").map(Number);
  const total = (((h * 60 + m + minutes) % 1440) + 1440) % 1440;
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

export function formatTime(time: string) {
  const [h, m] = time.split(":").map(Number);
  return new Date(2000, 0, 1, h, m).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

/** Daily reminder on/off and its time */
export function ReminderControls({ save, setError }: { save: (p: ProfilePatch) => void; setError: (e: string | null) => void }) {
  const { user } = useAuth();
  if (!user) return null;
  const on = user.remindersEnabled && Boolean(user.reminderTime);

  const toggle = async (next: boolean) => {
    if (next && !(await requestPermission())) {
      setError("Notifications are off for Lumen. Allow them in your phone’s settings, then try again.");
      return;
    }
    save({ remindersEnabled: next, ...(next && !user.reminderTime && { reminderTime: DEFAULT_REMINDER }) });
  };

  return (
    <>
      <Toggle label="Remind me to pray" hint="Once a day, skipped when you’ve already prayed." value={on} onChange={toggle} />
      {on && (
        <View className="mt-4 flex-row items-center justify-between">
          <Text className="font-sans-bold text-base text-ink">Time</Text>
          <View className="flex-row items-center gap-2">
            <Stepper label="−" onPress={() => save({ reminderTime: shiftTime(user.reminderTime!, -15) })} />
            <Text className="w-24 text-center font-sans-bold text-base text-ink">{formatTime(user.reminderTime!)}</Text>
            <Stepper label="+" onPress={() => save({ reminderTime: shiftTime(user.reminderTime!, 15) })} />
          </View>
        </View>
      )}
    </>
  );
}

function Stepper({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label === "+" ? "Later" : "Earlier"}
      className="h-10 w-10 items-center justify-center rounded-full border-[1.5px] border-line2 active:opacity-70"
    >
      <Text className="font-sans-bold text-lg text-ink">{label}</Text>
    </Pressable>
  );
}
