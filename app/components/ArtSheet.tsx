import type { ReactNode } from "react";
import { ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Light, type LightState } from "./Light";
import { Scene } from "./Scene";
import { IconButton } from "./ui/Button";
import { BackIcon } from "./ui/icons";
import { useColors } from "./ui/theme";
import type { SceneOptions } from "@website/lib/kit/art";

// Onboarding layout from the prototype (design/app.html): a full-bleed landscape, optionally with the Light
// rising in it, and a cream sheet sliding over its bottom edge.
export function ArtSheet({
  scene,
  sceneOptions,
  artHeight = 400,
  light,
  lightSize = 150,
  onBack,
  children,
}: {
  scene: string;
  sceneOptions?: SceneOptions;
  artHeight?: number;
  light?: LightState;
  lightSize?: number;
  onBack?: () => void;
  children: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  const c = useColors();

  return (
    <View className="flex-1 bg-bg">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} bounces={false} keyboardShouldPersistTaps="handled">
        <View style={{ height: artHeight }}>
          <Scene name={scene} options={light ? { noSun: true, ...sceneOptions } : sceneOptions} />
          {light && (
            <View style={{ position: "absolute", left: 0, right: 0, top: artHeight * 0.36 - lightSize / 2, alignItems: "center" }}>
              <Light size={lightSize} state={light} />
            </View>
          )}
          {onBack && (
            <View style={{ position: "absolute", top: insets.top + 8, left: 18 }}>
              <IconButton onPress={onBack} label="Back">
                <BackIcon size={18} color={c.ink} />
              </IconButton>
            </View>
          )}
        </View>
        <View className="-mt-8 flex-1 rounded-t-[32px] bg-bg px-6 pt-8" style={{ paddingBottom: insets.bottom + 20 }}>
          {children}
        </View>
      </ScrollView>
    </View>
  );
}
