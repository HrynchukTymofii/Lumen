import { ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Light } from "@/components/Light";
import { ScreenHeader } from "@/components/ScreenHeader";
import { PauseControls, ReminderControls, Section, useSaveProfile } from "@/components/SettingsParts";
import { LineButton } from "@/components/ui/Button";
import { useAuth } from "@/context/AuthContext";
import { askToSignIn } from "@/lib/account";

// Behind the bell on Home: the morning and evening reminders, pausing them (a church service), and a quiet empty state where updates will appear once there are any.
export default function NotificationsScreen() {
  const insets = useSafeAreaInsets();
  const { save, error, setError } = useSaveProfile();
  const { user } = useAuth();
  return (
    <View className="flex-1 bg-bg">
      <ScreenHeader title="Notifications" fallback="/today" />
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}>
        {error && <Text className="mx-5 mt-1 font-sans text-sm text-danger">{error}</Text>}
        <Section title="Reminders">
          {user ? (
            <ReminderControls save={save} setError={setError} />
          ) : (
            // The reminder's time is kept on the account
            <LineButton label="Sign in to set a reminder" onPress={() => askToSignIn("reminders")} />
          )}
        </Section>
        <Section>
          <PauseControls />
        </Section>
        <View className="mt-16 items-center px-10">
          <Light size={90} />
          <Text className="mt-5 text-center font-sans text-base leading-6 text-muted">You have no notifications yet. Updates and new prayers will show up here.</Text>
        </View>
      </ScrollView>
    </View>
  );
}
