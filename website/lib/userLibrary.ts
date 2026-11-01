import { z } from "zod";
import { prisma } from "@/lib/prisma";

// The app user's own library (favorites, recently prayed, intentions & reflections, Bible highlights / notes /
// bookmarks). The app keeps a copy on the phone and sends its changes here as a batch of operations (an outbox),
// so changes made offline arrive later. Every operation is idempotent; the newer `updatedAt` wins for entries and marks.

const ms = z.number().int().min(0); // epoch milliseconds, as the app stores them

export const opSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("favorite"), trackId: z.string().min(1).max(64), on: z.boolean(), at: ms }),
  z.object({ type: z.literal("played"), trackId: z.string().min(1).max(64), at: ms }),
  z.object({
    type: z.literal("journal"),
    id: z.string().min(1).max(64),
    kind: z.enum(["intention", "reflection"]),
    title: z.string().max(120),
    body: z.string().max(5000),
    createdAt: ms,
    updatedAt: ms,
    deleted: z.boolean().optional(),
  }),
  z.object({
    type: z.literal("mark"),
    osis: z.string().min(1).max(12),
    chapter: z.number().int().min(1).max(200),
    v: z.number().int().min(1).max(200),
    book: z.string().max(60),
    text: z.string().max(2000),
    translation: z.string().max(10),
    highlight: z.boolean(),
    color: z.enum(["yellow", "green", "blue", "pink"]).nullish(),
    note: z.string().max(5000),
    updatedAt: ms,
  }),
  z.object({
    type: z.literal("bookmark"),
    osis: z.string().min(1).max(12),
    chapter: z.number().int().min(1).max(200),
    book: z.string().max(60),
    on: z.boolean(),
    at: ms,
  }),
]);

export const syncBodySchema = z.object({ ops: z.array(opSchema).max(500) });
export type SyncOp = z.infer<typeof opSchema>;

const MAX_RECENT = 20;

/** Applies the app's operations in order */
export async function applyOps(userId: string, ops: SyncOp[]) {
  for (const op of ops) {
    switch (op.type) {
      case "favorite":
        if (op.on) {
          await prisma.favoriteTrack.upsert({
            where: { userId_trackId: { userId, trackId: op.trackId } },
            create: { userId, trackId: op.trackId, createdAt: new Date(op.at) },
            update: {},
          });
        } else {
          await prisma.favoriteTrack.deleteMany({ where: { userId, trackId: op.trackId } });
        }
        break;

      case "played": {
        const playedAt = new Date(op.at);
        await prisma.trackPlay.upsert({
          where: { userId_trackId: { userId, trackId: op.trackId } },
          create: { userId, trackId: op.trackId, playedAt },
          update: { playedAt },
        });
        break;
      }

      case "journal": {
        const existing = await prisma.journalEntry.findUnique({ where: { id: op.id }, select: { userId: true, updatedAt: true } });
        if (existing && existing.userId !== userId) break; // someone else's id: ignore
        if (existing && existing.updatedAt.getTime() > op.updatedAt) break; // a newer version is already here
        if (op.deleted) {
          await prisma.journalEntry.deleteMany({ where: { id: op.id, userId } });
          break;
        }
        const data = { kind: op.kind, title: op.title, body: op.body, updatedAt: new Date(op.updatedAt) };
        await prisma.journalEntry.upsert({
          where: { id: op.id },
          create: { id: op.id, userId, createdAt: new Date(op.createdAt), ...data },
          update: data,
        });
        break;
      }

      case "mark": {
        const key = { userId_osis_chapter_verse: { userId, osis: op.osis, chapter: op.chapter, verse: op.v } };
        const existing = await prisma.bibleMark.findUnique({ where: key, select: { updatedAt: true } });
        if (existing && existing.updatedAt.getTime() > op.updatedAt) break;
        const note = op.note.trim();
        // No highlight and no note: the mark is gone
        if (!op.highlight && !note) {
          await prisma.bibleMark.deleteMany({ where: { userId, osis: op.osis, chapter: op.chapter, verse: op.v } });
          break;
        }
        const data = {
          book: op.book,
          text: op.text,
          translation: op.translation,
          highlight: op.highlight,
          color: op.color ?? null,
          note,
          updatedAt: new Date(op.updatedAt),
        };
        await prisma.bibleMark.upsert({ where: key, create: { userId, osis: op.osis, chapter: op.chapter, verse: op.v, ...data }, update: data });
        break;
      }

      case "bookmark":
        if (op.on) {
          await prisma.bibleBookmark.upsert({
            where: { userId_osis_chapter: { userId, osis: op.osis, chapter: op.chapter } },
            create: { userId, osis: op.osis, chapter: op.chapter, book: op.book, createdAt: new Date(op.at) },
            update: {},
          });
        } else {
          await prisma.bibleBookmark.deleteMany({ where: { userId, osis: op.osis, chapter: op.chapter } });
        }
        break;
    }
  }

  // Keep "recently prayed" short
  const old = await prisma.trackPlay.findMany({ where: { userId }, orderBy: { playedAt: "desc" }, skip: MAX_RECENT, select: { trackId: true } });
  if (old.length) await prisma.trackPlay.deleteMany({ where: { userId, trackId: { in: old.map((p) => p.trackId) } } });
}

/** Everything, in the shapes the app stores (times as epoch ms) */
export async function getUserLibrary(userId: string) {
  const [favorites, plays, journal, marks, bookmarks] = await Promise.all([
    prisma.favoriteTrack.findMany({ where: { userId }, orderBy: { createdAt: "desc" } }),
    prisma.trackPlay.findMany({ where: { userId }, orderBy: { playedAt: "desc" }, take: MAX_RECENT }),
    prisma.journalEntry.findMany({ where: { userId }, orderBy: { updatedAt: "desc" } }),
    prisma.bibleMark.findMany({ where: { userId } }),
    prisma.bibleBookmark.findMany({ where: { userId }, orderBy: { createdAt: "desc" } }),
  ]);
  return {
    favorites: favorites.map((f) => f.trackId),
    recent: plays.map((p) => ({ id: p.trackId, at: p.playedAt.getTime() })),
    journal: journal.map((e) => ({ id: e.id, kind: e.kind, title: e.title, body: e.body, createdAt: e.createdAt.getTime(), updatedAt: e.updatedAt.getTime() })),
    marks: marks.map((m) => ({
      osis: m.osis,
      book: m.book,
      chapter: m.chapter,
      v: m.verse,
      text: m.text,
      translation: m.translation,
      highlight: m.highlight,
      ...(m.color && { color: m.color }),
      note: m.note,
      updatedAt: m.updatedAt.getTime(),
    })),
    bookmarks: bookmarks.map((b) => ({ osis: b.osis, book: b.book, chapter: b.chapter, at: b.createdAt.getTime() })),
  };
}
