import { ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ScreenHeader } from "@/components/ScreenHeader";
import { Chips, ReminderControls, Section, Toggle, useSaveProfile } from "@/components/SettingsParts";
import { useAuth } from "@/context/AuthContext";
import type { Translation } from "@/lib/api/types";
import { setThemePref, useThemePref, type ThemePref } from "@/lib/themePref";

// General settings. Every change saves right away (PATCH /api/me); the theme is kept on this device.

const THEMES: { value: ThemePref; label: string }[] = [
  { value: "system", label: "Automatic" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];

const TRANSLATIONS: { value: Translation; label: string }[] = [
  { value: "WEB", label: "World English" },
  { value: "KJV", label: "King James" },
  { value: "DRA", label: "Douay-Rheims" },
];

const GOALS = [3, 4, 5, 6, 7];

export default function GeneralSettings() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const { save, error, setError } = useSaveProfile();
  const theme = useThemePref();
  if (!user) return null;

  return (
    <View className="flex-1 bg-bg">
      <ScreenHeader title="General" fallback="/settings" />
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}>
        {error && <Text className="mx-5 mt-1 font-sans text-sm text-danger">{error}</Text>}

        <Section title="Theme">
          <Chips options={THEMES} value={theme} onChange={setThemePref} />
        </Section>

        <Section title="Daily reminder">
          <ReminderControls save={save} setError={setError} />
        </Section>

        <Section title="Weekly goal">
          <Text className="font-sans text-sm text-muted">Days a week you’d like to pray. Missed days never reset anything.</Text>
          <Chips options={GOALS.map((g) => ({ value: String(g), label: `${g} days` }))} value={String(user.weeklyGoal)} onChange={(g) => save({ weeklyGoal: Number(g) })} />
          <View className="mt-4">
            <Toggle label="Hide the week on Home" value={user.streakHidden} onChange={(streakHidden) => save({ streakHidden })} />
          </View>
        </Section>

        <Section title="Bible">
          <Text className="font-sans-bold text-sm text-ink">Translation</Text>
          <Chips options={TRANSLATIONS} value={user.translation} onChange={(translation) => save({ translation })} />
        </Section>

        <Section title="Companion">
          <Toggle label="AI companion" hint="Chat about the Bible and ask for prayers." value={user.aiEnabled} onChange={(aiEnabled) => save({ aiEnabled })} />
        </Section>
      </ScrollView>
    </View>
  );
}
