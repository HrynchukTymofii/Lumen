import api, { hasApiToken } from "./api/client";
import { createLocalStore } from "./localStore";

// The outbox for the person's library (lib/sync.ts): every change made on the phone is queued here, kept on the
// device, and sent to POST /api/me/sync in batches. A batch leaves the queue only once the server has it, so
// changes made offline go up later. The server applies each operation idempotently, so resending is harmless.

export type SyncOp =
  | { type: "favorite"; trackId: string; on: boolean; at: number }
  | { type: "played"; trackId: string; at: number }
  | { type: "journal"; id: string; kind: "intention" | "reflection"; title: string; body: string; createdAt: number; updatedAt: number; deleted?: boolean }
  | {
      type: "mark";
      osis: string;
      chapter: number;
      v: number;
      book: string;
      text: string;
      translation: string;
      highlight: boolean;
      color?: string;
      note: string;
      updatedAt: number;
    }
  | { type: "bookmark"; osis: string; chapter: number; book: string; on: boolean; at: number };

// What the server holds (GET/POST /api/me/sync), in the shapes the phone stores
export interface ServerLibrary {
  favorites: string[];
  recent: { id: string; at: number }[];
  journal: { id: string; kind: "intention" | "reflection"; title: string; body: string; createdAt: number; updatedAt: number }[];
  marks: { osis: string; book: string; chapter: number; v: number; text: string; translation: string; highlight: boolean; color?: string; note: string; updatedAt: number }[];
  bookmarks: { osis: string; book: string; chapter: number; at: number }[];
}

const BATCH = 200;
const outbox = createLocalStore<SyncOp[]>("sync.outbox.v1", [], (saved, current) => [...saved, ...current]);

export const pendingOps = () => outbox.get();
export const outboxReady = outbox.ready;
export const clearOutbox = () => outbox.set([]);

let timer: ReturnType<typeof setTimeout> | null = null;
let onSynced: ((lib: ServerLibrary) => void) | null = null;

/** lib/sync.ts hears about the server's copy after each successful send */
export function setOnSynced(fn: (lib: ServerLibrary) => void) {
  onSynced = fn;
}

export function enqueue(op: SyncOp) {
  outbox.set((list) => [...list, op]);
  // Changes come in bursts (typing a note, tapping colors): send shortly after the last one
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    flush().catch(() => {});
  }, 1500);
}

let running: Promise<ServerLibrary | null> | null = null;

/** Sends what's queued. Resolves to the server's library, or null when there was nothing to send / no sign-in. */
export function flush(): Promise<ServerLibrary | null> {
  running ??= (async () => {
    try {
      await outbox.ready();
      let lib: ServerLibrary | null = null;
      while (hasApiToken() && outbox.get().length) {
        const batch = outbox.get().slice(0, BATCH);
        const { data } = await api.post<ServerLibrary>("/me/sync", { ops: batch });
        // Ops queued while the request was out stay behind the sent ones
        outbox.set((list) => list.slice(batch.length));
        lib = data;
      }
      if (lib) onSynced?.(lib);
      return lib;
    } finally {
      running = null;
    }
  })();
  return running;
}
