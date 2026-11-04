import { useColorScheme } from "nativewind";

// Raw colors for props that can't take a class (icons, spinners, placeholder text). Mirrors global.css (Holy Hush palette).
const LIGHT = { ink: "#0E0E10", bg: "#FFFFFF", muted: "#55555C", dim: "#8A8A91", onPastel: "#0E0E10", oliveDeep: "#0E0E10", card: "#F3F3F5", line: "#E9E9EC", butter: "#F6E8C4", butterDeep: "#EED9A0", sage: "#DFE8D3", sky: "#D8E4EC", rose: "#F4DED4", lav: "#E6E2F0", olive: "#F5C77E", gold: "#F5C77E", select: "rgba(14,14,16,0.08)" };
const DARK = { ink: "#F4EEE4", bg: "#1C1915", muted: "#B6B0A6", dim: "#8D8982", onPastel: "#1C1915", oliveDeep: "#F4EEE4", card: "#2C2721", line: "#322D26", butter: "#ECDEBA", butterDeep: "#DDC98F", sage: "#D6DFCA", sky: "#D0DCE4", rose: "#ECD6CC", lav: "#DEDAE8", olive: "#F5C77E", gold: "#F5C77E", select: "rgba(244,238,228,0.12)" };

export function useColors() {
  const { colorScheme } = useColorScheme();
  return colorScheme === "dark" ? DARK : LIGHT;
}

export type Colors = ReturnType<typeof useColors>;

// Bible highlight colors (lib/bibleMarks.ts): pastel surfaces that keep dark ink in both themes
export function highlightColor(c: Colors, color: string | undefined) {
  return color === "green" ? c.sage : color === "blue" ? c.sky : color === "pink" ? c.rose : c.butter;
}
