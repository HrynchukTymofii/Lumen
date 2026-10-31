import { DENOMINATIONS } from "@website/funnels/options";
import { router } from "expo-router";
import { useState, type ReactNode } from "react";
import { Alert, Pressable, ScrollView, Switch, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ScreenHeader } from "@/components/ScreenHeader";
import { LineButton } from "@/components/ui/Button";
import { useColors } from "@/components/ui/theme";
import { useAuth } from "@/context/AuthContext";
import { errorMessage } from "@/lib/api/client";
import type { Denomination, ProfilePatch, Translation } from "@/lib/api/types";
import { reportError } from "@/lib/errorReporting";
import { requestPermission } from "@/lib/notifications";
import { purchasesEnabled, restore } from "@/lib/purchases";

// Settings (SPEC §10.2), opened from Journey: profile, Bible translation, reminder, weekly goal, companion,
// subscription, sign out, delete account. Every change saves right away (PATCH /api/me).

const TRANSLATIONS: { value: Translation; label: string }[] = [
  { value: "WEB", label: "World English" },
  { value: "KJV", label: "King James" },
  { value: "DRA", label: "Douay-Rheims" },
];

const GOALS = [3, 4, 5, 6, 7];
const PREMIUM_SOURCE = { stripe: "on the web", app_store: "in the App Store", play: "in Google Play" };
const DEFAULT_REMINDER = "07:30";

// "07:30" ± 15 minutes, wrapping around midnight
function shiftTime(time: string, minutes: number) {
  const [h, m] = time.split(":").map(Number);
  const total = (((h * 60 + m + minutes) % 1440) + 1440) % 1440;
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

function formatTime(time: string) {
  const [h, m] = time.split(":").map(Number);
  return new Date(2000, 0, 1, h, m).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

export default function SettingsScreen() {
  const { user, premium, updateProfile, refresh, signOut, deleteAccount } = useAuth();
  const insets = useSafeAreaInsets();
  const c = useColors();
  const [name, setName] = useState(user?.firstName ?? "");
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [restoring, setRestoring] = useState(false);

  // Saves one change; the account in AuthContext updates, so every screen sees it
  const save = (patch: ProfilePatch) => {
    setError(null);
    updateProfile(patch).catch((err) => {
      reportError(err);
      setError(errorMessage(err));
    });
  };

  const saveName = () => {
    const trimmed = name.trim();
    if (trimmed !== (user?.firstName ?? "")) save({ firstName: trimmed || null });
  };

  const toggleReminders = async (on: boolean) => {
    if (on && !(await requestPermission())) {
      setError("Notifications are off for Lumen. Allow them in your phone’s settings, then try again.");
      return;
    }
    save({ remindersEnabled: on, ...(on && !user?.reminderTime && { reminderTime: DEFAULT_REMINDER }) });
  };

  const restorePurchases = async () => {
    setRestoring(true);
    setError(null);
    try {
      const active = await restore();
      await refresh();
      Alert.alert(active ? "Purchases restored" : "Nothing to restore", active ? "Premium is active on this account." : "We didn’t find a subscription for this Apple or Google account.");
    } catch (err) {
      reportError(err);
      setError(errorMessage(err));
    } finally {
      setRestoring(false);
    }
  };

  const confirmDelete = () =>
    Alert.alert(
      "Delete your account?",
      "This deletes your account, conversations and settings for good. A subscription bought on the web is cancelled; one from the App Store or Google Play is cancelled in your phone’s settings.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setDeleting(true);
            try {
              await deleteAccount();
            } catch (err) {
              reportError(err);
              setError(errorMessage(err));
              setDeleting(false);
            }
          },
        },
      ],
    );

  if (!user) return null;
  const remindersOn = user.remindersEnabled && Boolean(user.reminderTime);

  return (
    <View className="flex-1 bg-bg">
      <ScreenHeader title="Settings" fallback="/journey" />
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 40 }} keyboardShouldPersistTaps="handled">
        {error && <Text className="mx-5 mt-1 font-sans text-sm text-danger">{error}</Text>}

        <Section title="Profile">
          <Text className="font-sans text-sm text-muted">Signed in as {user.email}</Text>
          <Text className="mt-4 font-sans-bold text-sm text-ink">First name</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            onEndEditing={saveName}
            onSubmitEditing={saveName}
            placeholder="Your first name"
            placeholderTextColor={c.dim}
            maxLength={40}
            autoCapitalize="words"
            returnKeyType="done"
            className="mt-2 h-12 rounded-2xl border-[1.5px] border-line2 bg-bg px-4 font-sans text-base text-ink"
          />
          <Text className="mt-4 font-sans-bold text-sm text-ink">Tradition</Text>
          <Chips
            options={DENOMINATIONS.map((d) => ({ value: d.value as Denomination, label: d.label }))}
            value={user.denomination}
            onChange={(denomination) => save({ denomination })}
          />
        </Section>

        <Section title="Daily reminder">
          <Toggle label="Remind me to pray" hint="Once a day, skipped when you’ve already prayed." value={remindersOn} onChange={toggleReminders} />
          {remindersOn && (
            <View className="mt-4 flex-row items-center justify-between">
              <Text className="font-sans-bold text-base text-ink">Time</Text>
              <View className="flex-row items-center gap-2">
                <Stepper label="−" onPress={() => save({ reminderTime: shiftTime(user.reminderTime!, -15) })} />
                <Text className="w-24 text-center font-sans-bold text-base text-ink">{formatTime(user.reminderTime!)}</Text>
                <Stepper label="+" onPress={() => save({ reminderTime: shiftTime(user.reminderTime!, 15) })} />
              </View>
            </View>
          )}
        </Section>

        <Section title="Weekly goal">
          <Text className="font-sans text-sm text-muted">Days a week you’d like to pray. Missed days never reset anything.</Text>
          <Chips
            options={GOALS.map((g) => ({ value: String(g), label: `${g} days` }))}
            value={String(user.weeklyGoal)}
            onChange={(g) => save({ weeklyGoal: Number(g) })}
          />
          <View className="mt-4">
            <Toggle label="Hide the week on Today" value={user.streakHidden} onChange={(streakHidden) => save({ streakHidden })} />
          </View>
        </Section>

        <Section title="Bible">
          <Text className="font-sans-bold text-sm text-ink">Translation</Text>
          <Chips options={TRANSLATIONS} value={user.translation} onChange={(translation) => save({ translation })} />
        </Section>

        <Section title="Companion">
          <Toggle label="AI companion" hint="Chat about the Bible and ask for prayers." value={user.aiEnabled} onChange={(aiEnabled) => save({ aiEnabled })} />
        </Section>

        <Section title="Subscription">
          {premium.active ? (
            <>
              <Text className="font-sans-bold text-base text-ink">Premium</Text>
              <Text className="mt-1 font-sans text-sm leading-5 text-muted">
                Bought {PREMIUM_SOURCE[premium.source]}
                {premium.currentPeriodEnd
                  ? ` · until ${new Date(premium.currentPeriodEnd).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`
                  : ""}
              </Text>
              {premium.source !== "stripe" && (
                <Text className="mt-2 font-sans text-sm leading-5 text-muted">
                  Manage or cancel it in your phone’s settings ({premium.source === "play" ? "Google Play → Subscriptions" : "Apple ID → Subscriptions"}).
                </Text>
              )}
            </>
          ) : (
            <>
              <Text className="font-sans-bold text-base text-ink">Free plan</Text>
              <Text className="mt-1 font-sans text-sm leading-5 text-muted">Bible, verse of the day and a daily prayer, forever.</Text>
              <View className="mt-4">
                <LineButton label="See Premium" onPress={() => router.push("/paywall")} />
              </View>
            </>
          )}
          {purchasesEnabled && (
            <Pressable onPress={restorePurchases} disabled={restoring} accessibilityRole="button" className="mt-3 items-center py-2 active:opacity-70">
              <Text className="font-sans-bold text-sm text-olive-deep">{restoring ? "Restoring…" : "Restore purchases"}</Text>
            </Pressable>
          )}
        </Section>

        <View className="mx-4 mt-6 gap-3">
          <LineButton label="Sign out" onPress={signOut} />
          <Pressable onPress={confirmDelete} disabled={deleting} accessibilityRole="button" className="items-center py-3 active:opacity-70">
            <Text className="font-sans-bold text-base text-danger">{deleting ? "Deleting…" : "Delete account"}</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View className="mx-4 mt-5">
      <Text className="mb-2 px-1 font-sans-bold text-xs uppercase tracking-[2px] text-muted">{title}</Text>
      <View className="rounded-[24px] bg-card px-5 py-5">{children}</View>
    </View>
  );
}

function Toggle({ label, hint, value, onChange }: { label: string; hint?: string; value: boolean; onChange: (v: boolean) => void }) {
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

function Chips<T extends string>({ options, value, onChange }: { options: { value: T; label: string }[]; value: T | null; onChange: (v: T) => void }) {
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
