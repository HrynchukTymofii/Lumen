import { useColorScheme } from "nativewind";

// Raw colors for props that can't take a class (icons, spinners, placeholder text). Mirrors global.css.
const LIGHT = { ink: "#26301F", bg: "#FAF8F1", muted: "#717866", dim: "#AAAE9E", onPastel: "#26301F", oliveDeep: "#5F7334" };
const DARK = { ink: "#EEF0E4", bg: "#141A10", muted: "#9CA38E", dim: "#5F6852", onPastel: "#26301F", oliveDeep: "#C3D38D" };

export function useColors() {
  const { colorScheme } = useColorScheme();
  return colorScheme === "dark" ? DARK : LIGHT;
}
