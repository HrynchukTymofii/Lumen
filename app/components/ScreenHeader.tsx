import { router, type Href } from "expo-router";
import type { ReactNode } from "react";
import { Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { IconButton } from "./ui/Button";
import { BackIcon } from "./ui/icons";
import { useColors } from "./ui/theme";

// Header for screens stacked over the tabs: back button, title, optional right-hand action.
// `fallback` is where Back goes when the screen was opened directly (a link, a notification).
export function ScreenHeader({ title, fallback, right }: { title?: string; fallback: Href; right?: ReactNode }) {
  const insets = useSafeAreaInsets();
  const c = useColors();
  return (
    <View className="flex-row items-center gap-3 px-4 pb-3" style={{ paddingTop: insets.top + 8 }}>
      <IconButton label="Back" onPress={() => (router.canGoBack() ? router.back() : router.replace(fallback))}>
        <BackIcon color={c.ink} />
      </IconButton>
      <Text className="flex-1 font-sans-bold text-lg text-ink" numberOfLines={1}>
        {title}
      </Text>
      {right}
    </View>
  );
}
