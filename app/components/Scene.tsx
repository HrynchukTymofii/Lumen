import { useMemo } from "react";
import type { StyleProp, ViewStyle } from "react-native";
import { SvgXml } from "react-native-svg";
import { sceneSvg, type SceneOptions } from "@website/lib/kit/art";

// Flat landscape scenes (SPEC §3), drawn by the same code as the website (website/lib/kit/art.ts).
// Names: dawn, golden, lake, meadow, dusk, evening, night, sky. Fills its parent, cropping like CSS `cover`.
export function Scene({ name, options, style }: { name: string; options?: SceneOptions; style?: StyleProp<ViewStyle> }) {
  const key = JSON.stringify(options ?? {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  // The web markup's class and aria-hidden attributes mean nothing to react-native-svg
  const xml = useMemo(() => sceneSvg(name, options).replace(/ (class|aria-hidden)="[^"]*"/g, ""), [name, key]);
  return <SvgXml xml={xml} width="100%" height="100%" style={style} />;
}
