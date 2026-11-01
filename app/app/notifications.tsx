import { ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Light } from "@/components/Light";
import { ScreenHeader } from "@/components/ScreenHeader";
import { ReminderControls, Section, useSaveProfile } from "@/components/SettingsParts";

// Behind the bell on Home: the daily reminder, and a quiet empty state where updates will appear once there are any.
export default function NotificationsScreen() {
  const insets = useSafeAreaInsets();
  const { save, error, setError } = useSaveProfile();
  return (
    <View className="flex-1 bg-bg">
      <ScreenHeader title="Notifications" fallback="/today" />
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}>
        {error && <Text className="mx-5 mt-1 font-sans text-sm text-danger">{error}</Text>}
        <Section title="Daily reminder">
          <ReminderControls save={save} setError={setError} />
        </Section>
        <View className="mt-16 items-center px-10">
          <Light size={90} />
          <Text className="mt-5 text-center font-sans text-base leading-6 text-muted">You have no notifications yet. Updates and new prayers will show up here.</Text>
        </View>
      </ScrollView>
    </View>
  );
}
