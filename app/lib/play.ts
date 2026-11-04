import { router } from "expo-router";
import { Share } from "react-native";
import type { Track } from "./api/types";
import { SITE_URL } from "./config";
import { reportError } from "./errorReporting";
import { openPaywall } from "./account";

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

/** A prayer's lines as paragraphs: lines flow together until one starts a new paragraph (set in the admin editor).
 *  Prayers without paragraph marks keep one paragraph per line. */
export function paragraphs(lines: Track["variants"][number]["lines"]) {
  if (!lines.some((l) => l.p)) return lines.map((l) => l.text);
  const out: string[] = [];
  lines.forEach((l, i) => (l.p || i === 0 ? out.push(l.text) : (out[out.length - 1] += ` ${l.text}`)));
  return out;
}

/** "1 · 3 · 5 min" */
export const trackMinutes = (t: Track) => `${t.variants.map((v) => v.minutes).join(" · ")} min`;

// A quick double tap (or a slow phone that takes a moment to open the screen) would push the screen twice and,
// for the player, start two copies of the audio at once. Taps within a second of an opening are ignored.
let lastOpen = 0;
function once() {
  const now = Date.now();
  if (now - lastOpen < 1000) return false;
  lastOpen = now;
  return true;
}

export function openTrack(track: Track) {
  if (!once()) return;
  router.push({ pathname: "/prayer/[slug]", params: { slug: track.slug } });
}

/** Straight into the player (the "tap play and it goes" hero). Locked → paywall; no audio yet → the prayer's page. */
export function playTrack(track: Track) {
  if (track.locked) return openPaywall("library");
  const variant = track.variants.find((v) => v.minutes === 3 && v.url) ?? track.variants.find((v) => v.url);
  if (!variant) return openTrack(track);
  openPlayer(track.slug, variant.minutes);
}

/** The player for one length of a prayer, opened once however many times it's tapped */
export function openPlayer(slug: string, minutes: number) {
  if (!once()) return;
  router.push({ pathname: "/player/[slug]", params: { slug, minutes: String(minutes) } });
}

/** The system share sheet with a link to the app's website */
export function shareApp() {
  Share.share({
    message: `I’ve been praying with Holy Hush: guided prayers, the Bible and a companion to talk things through. ${SITE_URL}`,
  }).catch(reportError);
}
