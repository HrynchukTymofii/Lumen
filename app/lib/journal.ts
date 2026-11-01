import { createLocalStore } from "./localStore";
import { enqueue } from "./syncQueue";

// Intentions (what you're praying for) and reflections (what prayer stirred in you): titled notes kept on this
// device and synced to the account (lib/sync.ts), written in the note drawer (components/NoteDrawer.tsx).

export type JournalKind = "intention" | "reflection";

export interface JournalEntry {
  id: string;
  kind: JournalKind;
  title: string;
  body: string;
  createdAt: number;
  updatedAt: number;
}

export const JOURNAL_LABELS: Record<JournalKind, { plural: string; single: string; titleHint: string; bodyHint: string; empty: string }> = {
  intention: {
    plural: "Intentions",
    single: "Intention",
    titleHint: "Who or what are you praying for?",
    bodyHint: "Write your intention…",
    empty: "Keep the people and needs you’re praying for in one place.",
  },
  reflection: {
    plural: "Reflections",
    single: "Reflection",
    titleHint: "Title",
    bodyHint: "What is God saying to you today?",
    empty: "Write down what stays with you after you pray.",
  },
};

const store = createLocalStore<JournalEntry[]>("journal.v1", [], (saved, current) => {
  const ids = new Set(current.map((e) => e.id));
  return [...current, ...saved.filter((e) => !ids.has(e.id))];
});

/** Entries of one kind, most recently edited first */
export function useJournal(kind: JournalKind) {
  const all = store.use();
  return all.filter((e) => e.kind === kind).sort((a, b) => b.updatedAt - a.updatedAt);
}

export function saveEntry(entry: { id?: string; kind: JournalKind; title: string; body: string }) {
  const now = Date.now();
  const title = entry.title.trim();
  const body = entry.body.trim();
  if (!title && !body) {
    if (entry.id) deleteEntry(entry.id);
    return;
  }
  const existing = entry.id ? store.get().find((e) => e.id === entry.id) : undefined;
  if (existing && existing.title === title && existing.body === body) return;
  const next: JournalEntry = existing
    ? { ...existing, title, body, updatedAt: now }
    : { id: `${now.toString(36)}${Math.random().toString(36).slice(2, 9)}`, kind: entry.kind, title, body, createdAt: now, updatedAt: now };
  store.set((all) => (existing ? all.map((e) => (e.id === next.id ? next : e)) : [next, ...all]));
  enqueue({ type: "journal", ...next });
}

export function deleteEntry(id: string) {
  const entry = store.get().find((e) => e.id === id);
  if (!entry) return;
  store.set((all) => all.filter((e) => e.id !== id));
  enqueue({ type: "journal", ...entry, updatedAt: Date.now(), deleted: true });
}

// For lib/sync.ts: the account's copy replaces the phone's
export const journalStore = store;
