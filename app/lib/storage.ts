import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

// Small private values (the login token, the cached profile). SecureStore has no web version,
// so the Expo web build keeps them in localStorage, the same place a website would.

export async function getSecure(key: string) {
  if (Platform.OS === "web") return globalThis.localStorage?.getItem(key) ?? null;
  return SecureStore.getItemAsync(key);
}

export async function setSecure(key: string, value: string) {
  if (Platform.OS === "web") return globalThis.localStorage?.setItem(key, value);
  return SecureStore.setItemAsync(key, value);
}

export async function deleteSecure(key: string) {
  if (Platform.OS === "web") return globalThis.localStorage?.removeItem(key);
  return SecureStore.deleteItemAsync(key);
}
