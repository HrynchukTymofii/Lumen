import { Linking, Modal, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SITE_URL } from "@/lib/config";
import { reportError } from "@/lib/errorReporting";
import { Light } from "./Light";
import { InkButton, LineButton } from "./ui/Button";

// Shown before the first companion message (lib/aiConsent.ts): names the AI providers, what they receive and why,
// and asks for an explicit yes. "Not now" sends nothing and keeps the typed message.

const SHARED = [
  ["Anthropic (Claude)", "writes the companion's replies. It receives your messages in this conversation, and your first name, tradition and what you asked prayer for, so the reply fits you."],
  ["Voyage AI", "finds Bible verses that match what you wrote. It receives the text of your message only."],
] as const;

export function AiConsentSheet({ onAgree, onClose }: { onAgree: () => void; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  return (
    <Modal transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent navigationBarTranslucent>
      <View className="flex-1 justify-end">
        <Pressable onPress={onClose} className="absolute inset-0 bg-black/40" accessibilityLabel="Not now" />
        <View className="max-h-[85%] rounded-t-[28px] bg-card" style={{ paddingBottom: insets.bottom + 16 }}>
          <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 24, paddingBottom: 8 }}>
            <View className="items-center">
              <Light size={52} state="idle" />
            </View>
            <Text className="mt-4 text-center font-display text-2xl text-ink">Before we talk</Text>
            <Text className="mt-2 text-center font-sans text-base leading-6 text-muted">
              The companion is powered by AI from other companies. To answer you, we send what you write to them:
            </Text>
            <View className="mt-5 gap-3">
              {SHARED.map(([name, what]) => (
                <View key={name} className="rounded-2xl bg-bg px-4 py-3">
                  <Text className="font-sans text-[15px] leading-[22px] text-ink">
                    <Text className="font-sans-bold">{name}</Text> {what}
                  </Text>
                </View>
              ))}
            </View>
            <Text className="mt-4 font-sans text-sm leading-5 text-muted">
              It’s used to answer you, and Anthropic doesn’t train its models on it. We never sell what you write or use
              it for ads. You can turn the AI companion off anytime in Settings → General.{" "}
              <Text
                className="font-sans-bold text-olive-deep underline"
                onPress={() => Linking.openURL(`${SITE_URL}/privacy`).catch(reportError)}
                accessibilityRole="link"
              >
                Privacy Policy
              </Text>
            </Text>
          </ScrollView>
          <View className="gap-2.5 px-6 pt-3">
            <InkButton label="I agree, continue" onPress={onAgree} />
            <LineButton label="Not now" onPress={onClose} />
          </View>
        </View>
      </View>
    </Modal>
  );
}
