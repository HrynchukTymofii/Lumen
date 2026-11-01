import { useState } from "react";
import { Linking, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ScreenHeader } from "@/components/ScreenHeader";
import { MenuRow } from "@/components/SettingsParts";
import { SITE_URL } from "@/lib/config";
import { reportError } from "@/lib/errorReporting";

// Legal: the website's privacy policy and terms, and where the Bible texts come from
export default function LegalSettings() {
  const insets = useSafeAreaInsets();
  const [showCopyright, setShowCopyright] = useState(false);
  const open = (path: string) => Linking.openURL(`${SITE_URL}${path}`).catch(reportError);
  return (
    <View className="flex-1 bg-bg">
      <ScreenHeader title="Legal" fallback="/settings" />
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}>
        <MenuRow label="Privacy Policy" onPress={() => open("/privacy")} />
        <MenuRow label="Terms of Service" onPress={() => open("/terms")} />
        <MenuRow label="Copyright Info" onPress={() => setShowCopyright((s) => !s)} />
        {showCopyright && (
          <Text className="mx-5 font-sans text-sm leading-6 text-muted">
            Scripture quotations are from the World English Bible, the King James Version and the Douay-Rheims Bible, all in the public domain. Prayers,
            recordings and artwork © Lumen.
          </Text>
        )}
      </ScrollView>
    </View>
  );
}
