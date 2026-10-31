import { useColorScheme } from "nativewind";

// Raw colors for props that can't take a class (icons, spinners, placeholder text). Mirrors global.css.
const LIGHT = { ink: "#26301F", bg: "#FAF8F1", muted: "#717866", dim: "#AAAE9E", onPastel: "#26301F", oliveDeep: "#5F7334", card: "#FFFFFF", line: "#E9E6D9" };
const DARK = { ink: "#EEF0E4", bg: "#141A10", muted: "#9CA38E", dim: "#5F6852", onPastel: "#26301F", oliveDeep: "#C3D38D", card: "#1D2518", line: "#262F1F" };

export function useColors() {
  const { colorScheme } = useColorScheme();
  return colorScheme === "dark" ? DARK : LIGHT;
}
