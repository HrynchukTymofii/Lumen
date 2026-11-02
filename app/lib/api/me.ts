import * as Application from "expo-application";
import { Platform } from "react-native";
import api from "./client";
import type { MeResponse, ProfilePatch, User } from "./types";

// The signed-in account (website/app/api/me/route.ts)

export async function getMe() {
  const { data } = await api.get<MeResponse>("/me");
  return data;
}

export async function updateMe(patch: ProfilePatch) {
  const { data } = await api.patch<{ user: User }>("/me", patch);
  return data.user;
}

// The installed app's store version and build, as the user table shows them
const app = {
  appVersion: Application.nativeApplicationVersion,
  appBuild: Application.nativeBuildVersion,
  platform: Platform.OS === "android" ? "android" : "ios",
} as const;

const SEEN_EVERY = 6 * 60 * 60 * 1000;
let seenAt = 0;

/** Tells the server which version and platform this person uses: on launch (force), then at most every 6 hours */
export async function reportSeen(force = false) {
  if (Platform.OS === "web" || (!force && Date.now() - seenAt < SEEN_EVERY)) return;
  seenAt = Date.now();
  await api.post("/me/seen", app).catch(() => (seenAt = 0));
}

export async function sendRating(rating: { stars: number; moment: "prayer" | "companion"; comment?: string }) {
  await api.post("/me/rating", { ...rating, platform: app.platform, appVersion: app.appVersion });
}

// Cancels web subscriptions and deletes everything. App Store subscriptions are cancelled in iOS settings.
export async function deleteMe() {
  await api.delete("/me");
}
