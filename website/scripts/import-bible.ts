// Loads the Bible into Postgres (SPEC §2.4, §6.8): World English Bible, King James and Douay-Rheims, all public
// domain. Downloads the sources, maps them to our 73 books, replaces each translation's verses, rebuilds the
// keyword index (search.verse_text) and the topic map. Safe to run again.
//   npm run bible:import                 all three
//   npm run bible:import -- --only KJV   one translation
import "dotenv/config";
import { unzipSync, strFromU8 } from "fflate";
import { BOOKS, type BookInfo } from "@/lib/bible/books";
import { parseRef } from "@/lib/bible/refs";
import { TOPICS } from "@/lib/bible/topics";
import { VERSES } from "@/funnels/verses";
import { prisma } from "@/lib/prisma";
import type { Translation } from "@/lib/generated/prisma/client";

type Verse = { bookId: number; chapter: number; verse: number; text: string };

const SOURCES: Record<Translation, string> = {
  // eBible.org, the WEB's publisher: one verse per line, "GEN 1:1 In the beginning…"
  WEB: "https://ebible.org/Scriptures/eng-web_vpl.zip",
  // scrollmapper/bible_databases: { books: [{ name, chapters: [{ chapter, verses: [{ verse, text }] }] }] }
  KJV: "https://raw.githubusercontent.com/scrollmapper/bible_databases/master/formats/json/KJV.json",
  DRA: "https://raw.githubusercontent.com/scrollmapper/bible_databases/master/formats/json/DRC.json",
};

const clean = (text: string) =>
  text
    .replace(/[[\]]/g, "") // KJV marks words added by the translators: "[but]"
    .replace(/\s+/g, " ")
    .trim();

async function download(url: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
  return new Uint8Array(await res.arrayBuffer());
}

async function loadWeb(): Promise<Verse[]> {
  const files = unzipSync(await download(SOURCES.WEB));
  const name = Object.keys(files).find((f) => f.endsWith("_vpl.txt"));
  if (!name) throw new Error("WEB zip has no *_vpl.txt");
  const byCode = new Map(BOOKS.map((b) => [b.web, b]));
  const verses: Verse[] = [];
  for (const line of strFromU8(files[name]).split(/\r?\n/)) {
    const m = /^(\w{3}) (\d+):(\d+) (.*)$/.exec(line);
    const book = m && byCode.get(m[1]); // skips the books we don't carry (Greek Esther, 1 Esdras, 3 Maccabees…)
    if (!m || !book || !m[4].trim()) continue;
    verses.push({ bookId: book.id, chapter: Number(m[2]), verse: Number(m[3]), text: clean(m[4]) });
  }
  return verses;
}

type ScrollJson = { books: { name: string; chapters: { chapter: number; verses: { verse: number; text: string }[] }[] }[] };

async function loadScroll(url: string): Promise<Verse[]> {
  const json = JSON.parse(new TextDecoder().decode(await download(url))) as ScrollJson;
  const byName = new Map<string, BookInfo>(BOOKS.map((b) => [b.scroll ?? b.name, b]));
  const verses: Verse[] = [];
  for (const b of json.books) {
    const book = byName.get(b.name); // skips appendix texts (Laodiceans, Prayer of Manasses, 1–2 Esdras)
    if (!book) continue;
    for (const c of b.chapters) {
      for (const v of c.verses) if (v.text.trim()) verses.push({ bookId: book.id, chapter: c.chapter, verse: v.verse, text: clean(v.text) });
    }
  }
  return verses;
}

async function importTranslation(translation: Translation) {
  const started = Date.now();
  const verses = translation === "WEB" ? await loadWeb() : await loadScroll(SOURCES[translation]);
  // A source occasionally repeats a verse number; keep the first
  const unique = [...new Map(verses.map((v) => [`${v.bookId}:${v.chapter}:${v.verse}`, v])).values()];

  await prisma.$transaction(
    async (tx) => {
      await tx.$executeRaw`DELETE FROM search.verse_text WHERE translation = ${translation}`;
      await tx.bibleVerse.deleteMany({ where: { translation } });
      for (let i = 0; i < unique.length; i += 5000) {
        await tx.bibleVerse.createMany({ data: unique.slice(i, i + 5000).map((v) => ({ translation, ...v })) });
      }
      await tx.$executeRaw`
        INSERT INTO search.verse_text (translation, book_id, chapter, verse, tsv)
        SELECT translation::text, "bookId", chapter, verse, to_tsvector('english', text)
        FROM "BibleVerse" WHERE translation = ${translation}::"Translation"`;
    },
    { timeout: 10 * 60 * 1000 },
  );
  const books = new Set(unique.map((v) => v.bookId)).size;
  console.log(`${translation}: ${unique.length} verses in ${books} books (${((Date.now() - started) / 1000).toFixed(1)}s)`);
}

async function importTopics() {
  const lists: Record<string, string[]> = { ...TOPICS };
  for (const [topic, verses] of Object.entries(VERSES)) lists[topic] = [...(lists[topic] ?? []), ...verses.map((v) => v.ref)];

  const rows = [];
  const problems: string[] = [];
  for (const [topic, refs] of Object.entries(lists)) {
    for (const [i, text] of [...new Set(refs)].entries()) {
      const ref = parseRef(text);
      const found =
        ref &&
        (await prisma.bibleVerse.count({
          where: { translation: "WEB", bookId: ref.bookId, chapter: ref.chapter, verse: { gte: ref.verseStart, lte: ref.verseEnd } },
        }));
      if (!ref || found !== ref.verseEnd - ref.verseStart + 1) problems.push(`${topic}: ${text}`);
      // Earlier entries in a list are the better answers
      else rows.push({ topic, ...ref, weight: 1 - i * 0.05 });
    }
  }
  await prisma.$transaction([prisma.topicVerse.deleteMany(), prisma.topicVerse.createMany({ data: rows })]);
  console.log(`Topics: ${rows.length} passages in ${Object.keys(lists).length} topics`);
  if (problems.length) console.warn(`Not found in WEB, skipped:\n  ${problems.join("\n  ")}`);
}

async function main() {
  const only = process.argv.includes("--only") ? process.argv[process.argv.indexOf("--only") + 1] : null;
  const translations = (Object.keys(SOURCES) as Translation[]).filter((t) => !only || t === only);
  if (!translations.length) throw new Error(`--only must be one of ${Object.keys(SOURCES).join(", ")}`);

  for (const b of BOOKS) {
    const data = { osis: b.osis, name: b.name, testament: b.testament };
    await prisma.bibleBook.upsert({ where: { id: b.id }, create: { id: b.id, ...data }, update: data });
  }
  for (const t of translations) await importTranslation(t);
  if (translations.includes("WEB")) await importTopics();
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
