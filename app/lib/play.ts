import { router } from "expo-router";
import { Share } from "react-native";
import type { Track } from "./api/types";
import { SITE_URL } from "./config";
import { reportError } from "./errorReporting";

// Where tapping a prayer goes, so every shelf behaves the same.

const CATEGORY_TITLES: Record<string, string> = {
  morning: "Morning prayers",
  evening: "Evening prayers",
  peace: "Peace & calm",
  psalms: "Scripture reflections",
  grief: "Grief & comfort",
  family: "Family",
  sleep: "Sleep",
};

export const categoryTitle = (key: string) => CATEGORY_TITLES[key] ?? key.charAt(0).toUpperCase() + key.slice(1);

/** "1 · 3 · 5 min" */
export const trackMinutes = (t: Track) => `${t.variants.map((v) => v.minutes).join(" · ")} min`;

export function openTrack(track: Track) {
  router.push({ pathname: "/prayer/[slug]", params: { slug: track.slug } });
}

/** Straight into the player (the "tap play and it goes" hero). Locked → paywall; no audio yet → the prayer's page. */
export function playTrack(track: Track) {
  if (track.locked) return router.push("/paywall");
  const variant = track.variants.find((v) => v.minutes === 3 && v.url) ?? track.variants.find((v) => v.url);
  if (!variant) return openTrack(track);
  router.push({ pathname: "/player/[slug]", params: { slug: track.slug, minutes: String(variant.minutes) } });
}

/** The system share sheet with a link to the app's website */
export function shareApp() {
  Share.share({
    message: `I’ve been praying with Lumen: guided prayers, the Bible and a companion to talk things through. ${SITE_URL}`,
  }).catch(reportError);
}
