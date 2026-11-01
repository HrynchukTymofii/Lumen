import * as Application from "expo-application";
import { router } from "expo-router";
import { Alert, Linking, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Light } from "@/components/Light";
import { ScreenHeader } from "@/components/ScreenHeader";
import { MenuRow } from "@/components/SettingsParts";
import { ChevronIcon } from "@/components/ui/icons";
import { useColors } from "@/components/ui/theme";
import { useAuth } from "@/context/AuthContext";
import { SITE_URL } from "@/lib/config";
import { reportError } from "@/lib/errorReporting";
import { shareApp } from "@/lib/play";

// Settings, opened from Me: the account card, then General, Contact & Support, Subscription, Share, Legal, Log out.
export default function SettingsScreen() {
  const { user, premium, signOut } = useAuth();
  const insets = useSafeAreaInsets();
  const c = useColors();
  if (!user) return null;

  const confirmSignOut = () =>
    Alert.alert("Log out?", "You can sign back in any time with the same email.", [
      { text: "Cancel", style: "cancel" },
      { text: "Log out", style: "destructive", onPress: signOut },
    ]);

  const version = [Application.nativeApplicationVersion, Application.nativeBuildVersion && `(${Application.nativeBuildVersion})`].filter(Boolean).join(" ");

  return (
    <View className="flex-1 bg-bg">
      <ScreenHeader title="Settings" fallback="/me" />
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}>
        <Pressable
          onPress={() => router.push("/settings/profile")}
          accessibilityRole="button"
          className="mx-4 mt-2 flex-row items-center gap-4 rounded-[24px] border-[1.5px] border-line2 bg-card px-5 py-4 active:opacity-80"
        >
          <Light size={52} />
          <View className="flex-1">
            <Text className="font-display text-[22px] leading-7 text-ink" numberOfLines={1}>
              {user.firstName || "Your profile"}
            </Text>
            <Text className="font-sans text-sm text-muted" numberOfLines={1}>
              {user.email}
            </Text>
          </View>
          <ChevronIcon color={c.dim} />
        </Pressable>

        <View className="mt-3">
          <MenuRow label="General" hint="Theme, reminders, goal, Bible, companion" href="/settings/general" />
          <MenuRow label="Contact & Support" onPress={() => Linking.openURL(`${SITE_URL}/support`).catch(reportError)} />
          <MenuRow label={premium.active ? "Subscription" : "Subscribe"} hint={premium.active ? "Premium" : "Try Premium free for 7 days"} href="/settings/subscription" />
          <MenuRow label="Share Lumen" onPress={shareApp} />
          <MenuRow label="Legal" href="/settings/legal" />
          <MenuRow label="Log out" onPress={confirmSignOut} />
        </View>

        <Text className="mt-6 px-6 text-center font-sans text-xs text-dim">
          {version ? `v${version} · ` : ""}
          {user.email}
        </Text>
      </ScrollView>
    </View>
  );
}
