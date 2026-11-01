import type { ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";

// A Discover tile: art filling a rounded card with its label in white over a soft shade at the bottom.
export function ArtTile({ label, onPress, art, width = "48.4%" }: { label: string; onPress: () => void; art: ReactNode; width?: `${number}%` | number }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} className="overflow-hidden rounded-3xl bg-card active:opacity-85" style={{ width, aspectRatio: 1.34 }}>
      {art}
      <BottomShade />
      <View className="absolute bottom-0 left-0 right-0 px-3 pb-3.5">
        <Text className="text-center font-sans-bold text-[17px] leading-6 text-white" numberOfLines={2}>
          {label}
        </Text>
      </View>
    </Pressable>
  );
}

export function BottomShade({ strength = 0.6 }: { strength?: number }) {
  return (
    <Svg style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }} width="100%" height="100%" pointerEvents="none">
      <Defs>
        <LinearGradient id="tileShade" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0.45" stopColor="#000" stopOpacity="0" />
          <Stop offset="1" stopColor="#000" stopOpacity={strength} />
        </LinearGradient>
      </Defs>
      <Rect x="0" y="0" width="100%" height="100%" fill="url(#tileShade)" />
    </Svg>
  );
}
