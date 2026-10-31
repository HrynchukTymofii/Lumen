// Builds the meaning-based search index (search.verse_embedding): every WEB verse alone and in windows of 3,
// embedded with Voyage. Needs VOYAGE_API_KEY and `npm run bible:import` first. Skips windows already done,
// so it can be stopped and run again. About 70k texts ≈ 3M tokens (cents; the Voyage free tier covers it).
//   npm run bible:embed
import "dotenv/config";
import { EMBED_MODEL, embed, embeddingsConfigured, toVector } from "@/lib/ai/embed";
import { prisma } from "@/lib/prisma";

const BATCH = 500;

type Window = { bookId: number; chapter: number; verseStart: number; verseEnd: number; text: string };

async function main() {
  if (!embeddingsConfigured()) throw new Error("Set VOYAGE_API_KEY in website/.env first.");

  const verses = await prisma.bibleVerse.findMany({
    where: { translation: "WEB" },
    orderBy: [{ bookId: "asc" }, { chapter: "asc" }, { verse: "asc" }],
    select: { bookId: true, chapter: true, verse: true, text: true },
  });
  if (!verses.length) throw new Error("No WEB verses: run `npm run bible:import` first.");

  const windows: Window[] = [];
  for (let i = 0; i < verses.length; i++) {
    const v = verses[i];
    windows.push({ bookId: v.bookId, chapter: v.chapter, verseStart: v.verse, verseEnd: v.verse, text: v.text });
    const group = verses.slice(i, i + 3);
    if (group.length === 3 && group.every((g) => g.bookId === v.bookId && g.chapter === v.chapter) && i % 2 === 0) {
      windows.push({ bookId: v.bookId, chapter: v.chapter, verseStart: v.verse, verseEnd: group[2].verse, text: group.map((g) => g.text).join(" ") });
    }
  }

  const done = new Set(
    (await prisma.$queryRaw<{ k: string }[]>`SELECT concat_ws(':', book_id, chapter, verse_start, verse_end) AS k FROM search.verse_embedding`).map((r) => r.k),
  );
  const todo = windows.filter((w) => !done.has(`${w.bookId}:${w.chapter}:${w.verseStart}:${w.verseEnd}`));
  console.log(`${windows.length} windows, ${todo.length} to embed with ${EMBED_MODEL}`);

  let tokens = 0;
  for (let i = 0; i < todo.length; i += BATCH) {
    const batch = todo.slice(i, i + BATCH);
    const res = await embed(batch.map((w) => w.text), "document");
    tokens += res.tokens;
    for (const [j, w] of batch.entries()) {
      await prisma.$executeRaw`
        INSERT INTO search.verse_embedding (book_id, chapter, verse_start, verse_end, embedding)
        VALUES (${w.bookId}, ${w.chapter}, ${w.verseStart}, ${w.verseEnd}, ${toVector(res.vectors[j])}::vector)
        ON CONFLICT DO NOTHING`;
    }
    console.log(`  ${Math.min(i + BATCH, todo.length)} / ${todo.length} (${tokens} tokens)`);
  }
  await prisma.aiUsage.create({ data: { kind: "embed", model: EMBED_MODEL, inputTokens: tokens } });
  console.log("Done.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
