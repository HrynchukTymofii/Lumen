import { router, type Href } from "expo-router";
import { useState, type ReactNode } from "react";
import { Pressable, Switch, Text, View } from "react-native";
import { useAuth } from "@/context/AuthContext";
import { errorMessage } from "@/lib/api/client";
import type { ProfilePatch } from "@/lib/api/types";
import { reportError } from "@/lib/errorReporting";
import { pauseReminders, requestPermission, resumeReminders, usePausedUntil } from "@/lib/notifications";
import { ChevronIcon } from "./ui/icons";
import { useColors } from "./ui/theme";

// Pieces of the Settings screens (app/settings/*) and the reminder controls also shown behind Home's bell.

export const DEFAULT_REMINDER = "07:30";
export const DEFAULT_EVENING_REMINDER = "21:00";

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

const NO_PERMISSION = "Notifications are off for Holy Hush. Allow them in your phone’s settings, then try again.";

/** Morning and evening reminders, each on/off with its time (the quiz's "When would you like to pray?" fills them) */
export function ReminderControls({ save, setError }: { save: (p: ProfilePatch) => void; setError: (e: string | null) => void }) {
  const { user } = useAuth();
  if (!user) return null;
  const slots = [
    { key: "reminderTime" as const, label: "Morning prayer", hint: "Skipped when you’ve already prayed today.", time: user.reminderTime, fallback: DEFAULT_REMINDER },
    { key: "eveningReminderTime" as const, label: "Evening prayer", hint: "A quiet minute to close the day.", time: user.eveningReminderTime ?? null, fallback: DEFAULT_EVENING_REMINDER },
  ];

  const toggle = async (key: (typeof slots)[number]["key"], fallback: string, next: boolean) => {
    if (next && !(await requestPermission())) return setError(NO_PERMISSION);
    // Turning one on also lifts the old all-reminders switch, so it can't stay silently off
    save(next ? { [key]: fallback, remindersEnabled: true } : { [key]: null });
  };

  return (
    <View className="gap-5">
      {slots.map((s) => {
        const on = user.remindersEnabled && Boolean(s.time);
        return (
          <View key={s.key}>
            <Toggle label={s.label} hint={s.hint} value={on} onChange={(v) => toggle(s.key, s.fallback, v)} />
            {on && (
              <View className="mt-3 flex-row items-center justify-between">
                <Text className="font-sans text-base text-muted">Time</Text>
                <View className="flex-row items-center gap-2">
                  <Stepper label="−" onPress={() => save({ [s.key]: shiftTime(s.time!, -15) })} />
                  <Text className="w-24 text-center font-sans-bold text-base text-ink">{formatTime(s.time!)}</Text>
                  <Stepper label="+" onPress={() => save({ [s.key]: shiftTime(s.time!, 15) })} />
                </View>
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}

// Pause choices: an hour or two for a service, or the rest of the day
const PAUSES = [
  { label: "1 hour", until: () => Date.now() + 3_600_000 },
  { label: "2 hours", until: () => Date.now() + 2 * 3_600_000 },
  { label: "4 hours", until: () => Date.now() + 4 * 3_600_000 },
  {
    label: "Until tomorrow",
    until: () => {
      const d = new Date();
      return new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1, 6, 0).getTime();
    },
  },
];

/** "Pause reminders" for a church service or a meeting: kept on this phone, prayer and reading reminders both */
export function PauseControls() {
  const until = usePausedUntil();
  if (until) {
    const end = new Date(until).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
    const sameDay = new Date(until).toDateString() === new Date().toDateString();
    return (
      <View className="flex-row items-center gap-4">
        <View className="flex-1">
          <Text className="font-sans-bold text-base text-ink">Reminders paused</Text>
          <Text className="mt-0.5 font-sans text-sm text-muted">Until {sameDay ? end : `tomorrow, ${end}`}</Text>
        </View>
        <Pressable
          onPress={() => resumeReminders().catch(reportError)}
          accessibilityRole="button"
          className="rounded-full bg-ink px-4 py-2.5 active:opacity-80"
        >
          <Text className="font-sans-semibold text-sm text-bg">Resume</Text>
        </Pressable>
      </View>
    );
  }
  return (
    <View>
      <Text className="font-sans-bold text-base text-ink">Pause reminders</Text>
      <Text className="mt-0.5 font-sans text-sm leading-5 text-muted">For a church service or a meeting. They come back on their own.</Text>
      <View className="mt-3 flex-row flex-wrap gap-2">
        {PAUSES.map((p) => (
          <Pressable
            key={p.label}
            onPress={() => pauseReminders(p.until()).catch(reportError)}
            accessibilityRole="button"
            accessibilityLabel={`Pause reminders for ${p.label.toLowerCase()}`}
            className="rounded-full border-[1.5px] border-line2 px-4 py-2 active:opacity-70"
          >
            <Text className="font-sans-bold text-sm text-ink">{p.label}</Text>
          </Pressable>
        ))}
      </View>
    </View>
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
