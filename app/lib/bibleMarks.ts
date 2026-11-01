import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSyncExternalStore } from "react";
import { reportError } from "./errorReporting";
import { createLocalStore } from "./localStore";
import { enqueue } from "./syncQueue";

// Highlights (in four colors), notes and chapter bookmarks in the Bible, kept on the phone and synced to the
// account (lib/sync.ts). A mark is keyed by book, chapter and verse, so it shows
// in every translation; it keeps the verse text it was made on for the notes list.

export interface Mark {
  osis: string;
  book: string; // display name, e.g. "Genesis"
  chapter: number;
  v: number;
  text: string;
  translation: string;
  highlight: boolean;
  color?: HighlightColor; // missing on highlights made before colors existed: yellow
  note: string;
  updatedAt: number;
}

export const HIGHLIGHT_COLORS = ["yellow", "green", "blue", "pink"] as const;
export type HighlightColor = (typeof HIGHLIGHT_COLORS)[number];

export interface LastRead {
  osis: string;
  book: string;
  chapter: number;
}

const MARKS_KEY = "bible.marks.v1";
const LAST_KEY = "bible.last.v1";

export const markKey = (osis: string, chapter: number, v: number) => `${osis}.${chapter}.${v}`;

let marks: Record<string, Mark> = {};
let last: LastRead | null = null;
let loaded = false;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (!loaded) load();
  return () => listeners.delete(listener);
}

let loading: Promise<void> | null = null;
function load() {
  loading ??= Promise.all([AsyncStorage.getItem(MARKS_KEY), AsyncStorage.getItem(LAST_KEY)])
    .then(([m, l]) => {
      // Anything saved before the read finished wins over what was on disk
      marks = { ...(m ? JSON.parse(m) : {}), ...marks };
      last ??= l ? JSON.parse(l) : null;
    })
    .catch(reportError)
    .finally(() => {
      loaded = true;
      emit();
    });
  return loading;
}

function persist() {
  AsyncStorage.setItem(MARKS_KEY, JSON.stringify(marks)).catch(reportError);
}

export function useMarks() {
  return useSyncExternalStore(subscribe, () => marks);
}

/** Where reading stopped; undefined until the saved value has been read */
export function useLastRead() {
  return useSyncExternalStore(subscribe, () => (loaded ? last : undefined));
}

type Verse = Omit<Mark, "highlight" | "color" | "note" | "updatedAt">;

// Saves the changes; a mark with no highlight and no note is removed
export function updateMark(verse: Verse, change: Partial<Pick<Mark, "highlight" | "color" | "note">>) {
  const key = markKey(verse.osis, verse.chapter, verse.v);
  const prev = marks[key];
  const next: Mark = {
    ...verse,
    highlight: change.highlight ?? prev?.highlight ?? false,
    color: change.color ?? prev?.color,
    note: (change.note ?? prev?.note ?? "").trim(),
    updatedAt: Date.now(),
  };
  const rest = { ...marks };
  delete rest[key];
  marks = next.highlight || next.note ? { ...rest, [key]: next } : rest;
  emit();
  persist();
  enqueue({ type: "mark", ...next });
}

/** For lib/sync.ts: the account's copy replaces the phone's */
export async function replaceMarks(next: Record<string, Mark>) {
  await load();
  marks = next;
  emit();
  persist();
}

export function setLastRead(value: LastRead) {
  if (last?.osis === value.osis && last.chapter === value.chapter) return;
  last = value;
  emit();
  AsyncStorage.setItem(LAST_KEY, JSON.stringify(value)).catch(reportError);
}

// ───────── Bookmarks: whole chapters ─────────

export interface Bookmark {
  osis: string;
  book: string;
  chapter: number;
  at: number;
}

const bookmarks = createLocalStore<Bookmark[]>("bible.bookmarks.v1", []);
export const useBookmarks = bookmarks.use;

export function toggleBookmark(b: Omit<Bookmark, "at">) {
  const at = Date.now();
  const on = !bookmarks.get().some((x) => x.osis === b.osis && x.chapter === b.chapter);
  bookmarks.set((list) => (on ? [{ ...b, at }, ...list] : list.filter((x) => !(x.osis === b.osis && x.chapter === b.chapter))));
  enqueue({ type: "bookmark", osis: b.osis, chapter: b.chapter, book: b.book, on, at });
}

export const bookmarkStore = bookmarks;
export const marksReady = () => load();
export const getMarks = () => marks;
