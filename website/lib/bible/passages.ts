import { prisma } from "@/lib/prisma";
import type { Translation } from "@/lib/generated/prisma/client";
import { bookById, bookByOsis } from "./books";
import { WHOLE_CHAPTER_END, formatRef, type Ref } from "./refs";

// Reading the Bible tables. Verse text shown anywhere in the product comes from here, never from a model.

export type Passage = Ref & { ref: string; text: string; translation: Translation };

// Douay-Rheims numbers the Psalms like the Vulgate (its Psalm 22 is "The Lord is my shepherd"), so a WEB/KJV
// reference would open the wrong psalm. Until the numbering is mapped, Psalms in DRA are shown from the WEB.
function sourceFor(translation: Translation, bookId: number): Translation {
  return translation === "DRA" && bookId === 19 ? "WEB" : translation;
}

async function readVerses(translation: Translation, ref: Ref) {
  return prisma.bibleVerse.findMany({
    where: { translation, bookId: ref.bookId, chapter: ref.chapter, verse: { gte: ref.verseStart, lte: ref.verseEnd } },
    orderBy: { verse: "asc" },
    select: { verse: true, text: true },
  });
}

/** The text of a reference in the reader's translation, falling back to the WEB when that translation lacks it. */
export async function getPassage(ref: Ref, translation: Translation = "WEB"): Promise<Passage | null> {
  let used = sourceFor(translation, ref.bookId);
  let verses = await readVerses(used, ref);
  if (!verses.length && used !== "WEB") {
    used = "WEB";
    verses = await readVerses(used, ref);
  }
  if (!verses.length) return null;
  // "Psalm 23" (whole chapter) or a range past the end: clip to the verses that exist
  const clipped = { ...ref, verseStart: verses[0].verse, verseEnd: verses[verses.length - 1].verse };
  // A whole chapter keeps its short label ("Romans 8", not "Romans 8:1–39")
  const label = ref.verseEnd >= WHOLE_CHAPTER_END && ref.verseStart === 1 ? formatRef(ref) : formatRef(clipped);
  return { ...clipped, ref: label, text: verses.map((v) => v.text).join(" "), translation: used };
}

export async function getPassages(refs: Ref[], translation: Translation = "WEB") {
  const out = await Promise.all(refs.map((r) => getPassage(r, translation)));
  return out.filter((p): p is Passage => p !== null);
}

/** Books in a translation with their chapter counts (KJV has no deuterocanon; Esther and Daniel differ in length). */
export async function listBooks(translation: Translation) {
  const rows = await prisma.$queryRaw<{ bookId: number; chapters: number }[]>`
    SELECT "bookId", MAX(chapter)::int AS chapters FROM "BibleVerse"
    WHERE translation = ${translation}::"Translation" GROUP BY "bookId" ORDER BY "bookId"`;
  return rows.map((r) => {
    const b = bookById.get(r.bookId)!;
    return { id: b.id, osis: b.osis, name: b.name, testament: b.testament, chapters: r.chapters };
  });
}

/** One chapter for the reader, with links to the chapters before and after (across books). */
export async function getChapter(translation: Translation, osis: string, chapter: number) {
  const book = bookByOsis.get(osis.toLowerCase());
  if (!book) return null;
  const used = sourceFor(translation, book.id);
  const verses = await prisma.bibleVerse.findMany({
    where: { translation: used, bookId: book.id, chapter },
    orderBy: { verse: "asc" },
    select: { verse: true, text: true },
  });
  if (!verses.length) return null;

  const books = await listBooks(translation);
  const i = books.findIndex((b) => b.id === book.id);
  const current = books[i];
  const prevBook = books[i - 1];
  const nextBook = books[i + 1];
  const prev = chapter > 1 ? { osis: book.osis, chapter: chapter - 1 } : prevBook ? { osis: prevBook.osis, chapter: prevBook.chapters } : null;
  const next =
    current && chapter < current.chapters ? { osis: book.osis, chapter: chapter + 1 } : nextBook ? { osis: nextBook.osis, chapter: 1 } : null;

  return {
    book: { id: book.id, osis: book.osis, name: book.name, testament: book.testament },
    chapter,
    translation: used,
    verses: verses.map((v) => ({ v: v.verse, text: v.text })),
    prev,
    next,
  };
}
