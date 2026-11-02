import type { Href } from "expo-router";
import { Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { askToSignIn, type AccountReason } from "@/lib/account";
import { Light } from "./Light";
import { ScreenHeader } from "./ScreenHeader";
import { InkButton } from "./ui/Button";

// A screen that needs an account, opened without one (lib/account.ts): what it is for, and the way to sign in
export function AccountGate({ title, text, reason, fallback }: { title: string; text: string; reason: AccountReason; fallback: Href }) {
  const insets = useSafeAreaInsets();
  return (
    <View className="flex-1 bg-bg">
      <ScreenHeader title={title} fallback={fallback} />
      <View className="flex-1 items-center justify-center px-8" style={{ paddingBottom: insets.bottom + 40 }}>
        <Light size={90} />
        <Text className="mt-5 text-center font-sans text-base leading-6 text-muted">{text}</Text>
        <View className="mt-6 w-full">
          <InkButton label="Create a free account" onPress={() => askToSignIn(reason)} />
        </View>
      </View>
    </View>
  );
}
