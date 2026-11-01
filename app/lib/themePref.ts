import { colorScheme } from "nativewind";
import { useEffect } from "react";
import { createLocalStore } from "./localStore";

// Light, dark, or follow the phone (Settings → General → Theme). Kept on this device.
export type ThemePref = "system" | "light" | "dark";

const store = createLocalStore<ThemePref>("theme.v1", "system");
export const useThemePref = store.use;
export const setThemePref = store.set;

/** Applies the saved choice; mounted once in the root layout */
export function useApplyTheme() {
  const pref = store.use();
  useEffect(() => {
    try {
      colorScheme.set(pref);
    } catch {
      // The web build of NativeWind can't switch themes with darkMode "class" before the DOM is ready
    }
  }, [pref]);
}
