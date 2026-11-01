import api, { hasApiToken } from "./api/client";
import { bookmarkStore, getMarks, markKey, marksReady, replaceMarks, type Mark } from "./bibleMarks";
import { reportError } from "./errorReporting";
import { journalStore, type JournalEntry } from "./journal";
import { createLocalStore } from "./localStore";
import { clearOutbox, enqueue, flush, outboxReady, pendingOps, setOnSynced, type ServerLibrary, type SyncOp } from "./syncQueue";
import { libraryStores, sortRecent } from "./userLibrary";

// Keeps the person's library on their account (website: GET/POST /api/me/sync, lib/userLibrary.ts): favorites,
// recently prayed, intentions & reflections, Bible highlights / notes / bookmarks. The phone works from its own
// copy (fast, offline); changes go up through the outbox (lib/syncQueue.ts), and the account's copy comes down on
// sign-in and whenever the app returns to the foreground. Downloads stay per phone: they're files on it.

// Whose library is on this phone, so data saved before syncing existed is uploaded once, to the right account
const owner = createLocalStore<string | null>("sync.owner.v1", null);

type State = {
  favorites: string[];
  recent: { id: string; at: number }[];
  journal: JournalEntry[];
  marks: Record<string, Mark>;
  bookmarks: { osis: string; book: string; chapter: number; at: number }[];
};

// Same rules as the server, so changes still waiting in the outbox stay visible over the account's copy
function applyOp(s: State, op: SyncOp): State {
  switch (op.type) {
    case "favorite":
      return { ...s, favorites: op.on ? [op.trackId, ...s.favorites.filter((x) => x !== op.trackId)] : s.favorites.filter((x) => x !== op.trackId) };
    case "played":
      return { ...s, recent: sortRecent([{ id: op.trackId, at: op.at }, ...s.recent]) };
    case "journal": {
      const rest = s.journal.filter((e) => e.id !== op.id);
      if (op.deleted) return { ...s, journal: rest };
      const { id, kind, title, body, createdAt, updatedAt } = op;
      return { ...s, journal: [{ id, kind, title, body, createdAt, updatedAt }, ...rest] };
    }
    case "mark": {
      const key = markKey(op.osis, op.chapter, op.v);
      const rest = { ...s.marks };
      delete rest[key];
      if (!op.highlight && !op.note.trim()) return { ...s, marks: rest };
      const { type: _type, ...mark } = op;
      return { ...s, marks: { ...rest, [key]: { ...mark, color: mark.color as Mark["color"] } } };
    }
    case "bookmark": {
      const rest = s.bookmarks.filter((b) => !(b.osis === op.osis && b.chapter === op.chapter));
      return { ...s, bookmarks: op.on ? [{ osis: op.osis, book: op.book, chapter: op.chapter, at: op.at }, ...rest] : rest };
    }
  }
}

async function storesReady() {
  await Promise.all([libraryStores.recent.ready(), libraryStores.favorites.ready(), journalStore.ready(), bookmarkStore.ready(), marksReady()]);
}

/** Replaces the phone's copy with the account's, plus whatever is still waiting to be sent */
async function applyServer(lib: ServerLibrary) {
  await storesReady();
  let state: State = {
    favorites: lib.favorites,
    recent: lib.recent,
    journal: lib.journal,
    marks: Object.fromEntries(lib.marks.map((m) => [markKey(m.osis, m.chapter, m.v), { ...m, color: m.color as Mark["color"] }])),
    bookmarks: lib.bookmarks,
  };
  for (const op of pendingOps()) state = applyOp(state, op);
  libraryStores.favorites.set(state.favorites);
  libraryStores.recent.set(state.recent);
  journalStore.set(state.journal);
  bookmarkStore.set(state.bookmarks);
  await replaceMarks(state.marks);
}

setOnSynced((lib) => {
  applyServer(lib).catch(reportError);
});

// Everything on the phone as operations, for the first upload
function localAsOps(): SyncOp[] {
  const ops: SyncOp[] = [];
  const now = Date.now();
  [...libraryStores.favorites.get()].reverse().forEach((trackId) => ops.push({ type: "favorite", trackId, on: true, at: now }));
  libraryStores.recent.get().forEach((p) => ops.push({ type: "played", trackId: p.id, at: p.at }));
  journalStore.get().forEach((e) => ops.push({ type: "journal", ...e }));
  Object.values(getMarks()).forEach((m) => ops.push({ type: "mark", ...m }));
  bookmarkStore.get().forEach((b) => ops.push({ type: "bookmark", osis: b.osis, chapter: b.chapter, book: b.book, on: true, at: b.at }));
  return ops;
}

let pulling: Promise<void> | null = null;

/** Brings the phone and the account in step. Safe to call often (sign-in, app foreground). */
export function syncLibrary(userId: string) {
  pulling ??= (async () => {
    try {
      if (!hasApiToken()) return;
      await Promise.all([storesReady(), outboxReady(), owner.ready()]);
      const previous = owner.get();
      if (previous !== userId) {
        if (previous === null) {
          // Saved on this phone before syncing existed: it belongs to this account
          localAsOps().forEach(enqueue);
        } else {
          // Another account's library (shouldn't happen: sign-out clears it)
          await clearLocalLibrary();
        }
        owner.set(userId);
      }
      // Sending returns the account's copy; with nothing to send, fetch it
      const lib = (await flush()) ?? (await api.get<ServerLibrary>("/me/sync")).data;
      await applyServer(lib);
    } catch {
      // Offline or the server is down: the phone's copy and the outbox carry on, and the next sync catches up
    } finally {
      pulling = null;
    }
  })();
  return pulling;
}

/** Sends anything still queued (best effort, e.g. before signing out) */
export async function flushLibrary() {
  await flush().catch(() => null);
}

/** Sign-out: the next person on this phone shouldn't see this library */
export async function clearLocalLibrary() {
  await storesReady();
  clearOutbox();
  libraryStores.favorites.set([]);
  libraryStores.recent.set([]);
  journalStore.set([]);
  bookmarkStore.set([]);
  await replaceMarks({});
  owner.set(null);
}
