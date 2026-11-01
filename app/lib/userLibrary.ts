import { Platform } from "react-native";
import type { Track, TrackVariant } from "./api/types";
import { reportError } from "./errorReporting";
import { createLocalStore } from "./localStore";
import { enqueue } from "./syncQueue";

// The person's own shelf of prayers: recently played and favorites (kept on the phone and synced to the account,
// lib/sync.ts) and downloads (audio saved on this phone only, for offline use). Tracks are stored by id and looked up in the library, so titles and art stay current.

export interface Played {
  id: string;
  at: number;
}

export interface Download {
  id: string; // track id
  minutes: number;
  uri: string; // local file
  at: number;
}

const MAX_RECENT = 20;

const recent = createLocalStore<Played[]>("library.recent.v1", [], (saved, current) => dedupe([...current, ...saved]));
const favorites = createLocalStore<string[]>("library.favorites.v1", [], (saved, current) => [...new Set([...current, ...saved])]);
const downloads = createLocalStore<Record<string, Download>>("library.downloads.v1", {}, (saved, current) => ({ ...saved, ...current }));

function dedupe(list: Played[]) {
  const seen = new Set<string>();
  return list.filter((p) => !seen.has(p.id) && seen.add(p.id)).slice(0, MAX_RECENT);
}

export const useRecent = recent.use;
export const useFavorites = favorites.use;
export const useDownloads = downloads.use;

/** Puts a track at the front of "Recently prayed" */
export function recordPlayed(id: string) {
  const at = Date.now();
  recent.set((list) => dedupe([{ id, at }, ...list]));
  enqueue({ type: "played", trackId: id, at });
}

export function toggleFavorite(id: string) {
  const on = !favorites.get().includes(id);
  favorites.set((list) => (on ? [id, ...list.filter((x) => x !== id)] : list.filter((x) => x !== id)));
  enqueue({ type: "favorite", trackId: id, on, at: Date.now() });
}

// For lib/sync.ts: the account's copy replaces the phone's
export const libraryStores = { recent, favorites };
export const sortRecent = (list: Played[]) => dedupe([...list].sort((a, b) => b.at - a.at));

/** The tracks behind a list of ids, in that order, skipping ones no longer in the library */
export function pick(tracks: Track[] | undefined, ids: string[]) {
  if (!tracks) return [];
  const byId = new Map(tracks.map((t) => [t.id, t]));
  return ids.map((id) => byId.get(id)).filter((t): t is Track => Boolean(t));
}

// ───────── Downloads ─────────

export const downloadsSupported = Platform.OS !== "web";
export const downloadKey = (id: string, minutes: number) => `${id}.${minutes}`;

/** The saved file for this length of a track, if it was downloaded */
export function localAudio(id: string, minutes: number) {
  return downloads.get()[downloadKey(id, minutes)]?.uri ?? null;
}

/** Saves a length of a track for offline listening. Loaded on demand, so the web build never imports the module. */
export async function downloadTrack(track: Track, variant: TrackVariant) {
  if (!variant.url) throw new Error("This prayer has no audio yet.");
  const { Directory, File, Paths } = await import("expo-file-system");
  const dir = new Directory(Paths.document, "prayers");
  dir.create({ idempotent: true, intermediates: true });
  const ext = /\.(mp3|m4a|aac|wav|ogg)(?:\?|$)/i.exec(variant.url)?.[1] ?? "mp3";
  const file = await File.downloadFileAsync(variant.url, new File(dir, `${track.id}-${variant.minutes}.${ext}`), { idempotent: true });
  downloads.set((all) => ({
    ...all,
    [downloadKey(track.id, variant.minutes)]: { id: track.id, minutes: variant.minutes, uri: file.uri, at: Date.now() },
  }));
}

export async function removeDownload(id: string, minutes: number) {
  const key = downloadKey(id, minutes);
  const saved = downloads.get()[key];
  if (!saved) return;
  try {
    const { File } = await import("expo-file-system");
    const file = new File(saved.uri);
    if (file.exists) file.delete();
  } catch (err) {
    reportError(err);
  }
  downloads.set((all) => {
    const rest = { ...all };
    delete rest[key];
    return rest;
  });
}

/** Downloaded tracks, newest first, one entry per track */
export function downloadedIds(all: Record<string, Download>) {
  return [...new Set(Object.values(all).sort((a, b) => b.at - a.at).map((d) => d.id))];
}
