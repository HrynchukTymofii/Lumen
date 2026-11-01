import { DENOMINATIONS } from "@website/funnels/options";
import { useState } from "react";
import { Alert, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ScreenHeader } from "@/components/ScreenHeader";
import { Chips, Section, useSaveProfile } from "@/components/SettingsParts";
import { useColors } from "@/components/ui/theme";
import { useAuth } from "@/context/AuthContext";
import { errorMessage } from "@/lib/api/client";
import type { Denomination } from "@/lib/api/types";
import { reportError } from "@/lib/errorReporting";

// Profile: first name, tradition, and deleting the account
export default function ProfileSettings() {
  const { user, deleteAccount } = useAuth();
  const insets = useSafeAreaInsets();
  const c = useColors();
  const { save, error, setError } = useSaveProfile();
  const [name, setName] = useState(user?.firstName ?? "");
  const [deleting, setDeleting] = useState(false);
  if (!user) return null;

  const saveName = () => {
    const trimmed = name.trim();
    if (trimmed !== (user.firstName ?? "")) save({ firstName: trimmed || null });
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

  return (
    <View className="flex-1 bg-bg">
      <ScreenHeader title="Profile" fallback="/settings" />
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 40 }} keyboardShouldPersistTaps="handled">
        {error && <Text className="mx-5 mt-1 font-sans text-sm text-danger">{error}</Text>}
        <Section>
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

        <Pressable onPress={confirmDelete} disabled={deleting} accessibilityRole="button" className="mt-8 items-center py-3 active:opacity-70">
          <Text className="font-sans-bold text-base text-danger">{deleting ? "Deleting…" : "Delete account"}</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}
