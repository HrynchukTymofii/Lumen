import { useColorScheme } from "nativewind";

// Raw colors for props that can't take a class (icons, spinners, placeholder text). Mirrors global.css.
const LIGHT = { ink: "#26301F", bg: "#FAF8F1", muted: "#717866", dim: "#AAAE9E", onPastel: "#26301F", oliveDeep: "#5F7334", card: "#FFFFFF", line: "#E9E6D9", butter: "#F2E4B4", butterDeep: "#E9D48C", sage: "#D8E3C4", sky: "#D6E3E0", rose: "#EFDACF", lav: "#E3E0EA", olive: "#C5D19E", gold: "#E3C771", select: "rgba(95,115,52,0.14)" };
const DARK = { ink: "#EEF0E4", bg: "#141A10", muted: "#9CA38E", dim: "#5F6852", onPastel: "#26301F", oliveDeep: "#C3D38D", card: "#1D2518", line: "#262F1F", butter: "#E8DBAC", butterDeep: "#DCC985", sage: "#CFDBBB", sky: "#CEDCD9", rose: "#E5D1C6", lav: "#DAD7E2", olive: "#C5D19E", gold: "#E3C771", select: "rgba(195,211,141,0.18)" };

export function useColors() {
  const { colorScheme } = useColorScheme();
  return colorScheme === "dark" ? DARK : LIGHT;
}

export type Colors = ReturnType<typeof useColors>;

// Bible highlight colors (lib/bibleMarks.ts): pastel surfaces that keep dark ink in both themes
export function highlightColor(c: Colors, color: string | undefined) {
  return color === "green" ? c.sage : color === "blue" ? c.sky : color === "pink" ? c.rose : c.butter;
}
