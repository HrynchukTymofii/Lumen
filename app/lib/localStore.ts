import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSyncExternalStore } from "react";
import { reportError } from "./errorReporting";

// A value kept on this device (AsyncStorage) that screens read with a hook and that re-renders them when it changes.
// Loaded on first use; anything set before the load finished wins over what was on disk.

export function createLocalStore<T>(key: string, initial: T, merge: (saved: T, current: T) => T = (saved) => saved) {
  let value = initial;
  let loaded = false;
  let loading: Promise<void> | null = null;
  let changedBeforeLoad = false;
  const listeners = new Set<() => void>();
  const emit = () => listeners.forEach((l) => l());

  function load() {
    loading ??= AsyncStorage.getItem(key)
      .then((raw) => {
        if (raw) value = changedBeforeLoad ? merge(JSON.parse(raw) as T, value) : (JSON.parse(raw) as T);
      })
      .catch(reportError)
      .finally(() => {
        loaded = true;
        emit();
      });
    return loading;
  }

  function subscribe(listener: () => void) {
    listeners.add(listener);
    if (!loaded) load();
    return () => {
      listeners.delete(listener);
    };
  }

  return {
    use: () => useSyncExternalStore(subscribe, () => value),
    get: () => value,
    /** Resolves once the saved value has been read */
    ready: () => (loaded ? Promise.resolve() : load()),
    set(next: T | ((prev: T) => T)) {
      value = typeof next === "function" ? (next as (prev: T) => T)(value) : next;
      if (!loaded) changedBeforeLoad = true;
      emit();
      AsyncStorage.setItem(key, JSON.stringify(value)).catch(reportError);
    },
  };
}
