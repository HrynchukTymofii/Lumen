import { embed, embeddingsConfigured, toVector } from "@/lib/ai/embed";
import { prisma } from "@/lib/prisma";
import { findRefs, type Ref } from "./refs";

// Finding passages for the companion (SPEC §7.2 step 5). Results are references; the text is read separately
// in the user's translation. Raw SQL on the `search` schema (see the bible migration).

const STOP = new Set(
  "a an and are as at be been but by can could did do does for from had has have how i if in into is it its me my of on or our so than that the their them then there these they this to too us was we were what when where which who why will with would you your am im dont feel get got just like know really want mean means really about please help tell said say thing things something lot much very still ever also".split(
    " ",
  ),
);

/** Keyword search over the WEB: any of the meaningful words, best matches first. */
export async function keywordSearch(text: string, limit = 12): Promise<Ref[]> {
  const words = [...new Set(text.toLowerCase().match(/[a-z]{3,}/g) ?? [])].filter((w) => !STOP.has(w)).slice(0, 12);
  if (!words.length) return [];
  // Verses that contain more of the different words win ("forgive" + "brother" beats "brother" three times)
  const rows = await prisma.$queryRaw<{ book_id: number; chapter: number; verse: number }[]>`
    WITH words AS (SELECT to_tsquery('english', w) AS q FROM unnest(${words}::text[]) AS w WHERE to_tsquery('english', w)::text <> ''),
         anyq AS (SELECT to_tsquery('english', ${words.join(" | ")}) AS q)
    SELECT t.book_id, t.chapter, t.verse FROM search.verse_text t, anyq
    WHERE t.translation = 'WEB' AND t.tsv @@ anyq.q
    ORDER BY (SELECT count(*) FROM words WHERE t.tsv @@ words.q) DESC, ts_rank_cd(t.tsv, anyq.q) DESC, length(t.tsv) ASC
    LIMIT ${limit}`;
  return rows.map((r) => ({ bookId: r.book_id, chapter: r.chapter, verseStart: r.verse, verseEnd: r.verse }));
}

/** Meaning-based search (pgvector). Empty until VOYAGE_API_KEY is set and `npm run bible:embed` has run. */
export async function semanticSearch(text: string, limit = 12): Promise<{ refs: Ref[]; tokens: number }> {
  if (!embeddingsConfigured()) return { refs: [], tokens: 0 };
  const [{ count }] = await prisma.$queryRaw<{ count: number }[]>`SELECT count(*)::int AS count FROM search.verse_embedding`;
  if (!count) return { refs: [], tokens: 0 };
  const { vectors, tokens } = await embed([text], "query");
  const rows = await prisma.$queryRaw<{ book_id: number; chapter: number; verse_start: number; verse_end: number }[]>`
    SELECT book_id, chapter, verse_start, verse_end FROM search.verse_embedding
    ORDER BY embedding <=> ${toVector(vectors[0])}::vector
    LIMIT ${limit}`;
  return { refs: rows.map((r) => ({ bookId: r.book_id, chapter: r.chapter, verseStart: r.verse_start, verseEnd: r.verse_end })), tokens };
}

/** Hand-picked passages for topics the classifier found (anxiety, forgiveness…), best first. */
export async function topicSearch(topics: string[], limit = 6): Promise<Ref[]> {
  if (!topics.length) return [];
  const rows = await prisma.topicVerse.findMany({ where: { topic: { in: topics } }, orderBy: { weight: "desc" }, take: limit * 2 });
  return rows.map((r) => ({ bookId: r.bookId, chapter: r.chapter, verseStart: r.verseStart, verseEnd: r.verseEnd }));
}

const overlaps = (a: Ref, b: Ref) =>
  a.bookId === b.bookId && a.chapter === b.chapter && a.verseStart <= b.verseEnd && b.verseStart <= a.verseEnd;

/**
 * Passages for one companion message: references the user named first, then the topic map, then meaning-based
 * hits, then keywords. Overlapping passages are kept once. Topics come from the safety classifier.
 */
export async function retrieve(input: { message: string; context?: string; topics?: string[] }, limit = 8) {
  const explicit = findRefs(input.message).slice(0, 3);
  const query = [input.context, input.message].filter(Boolean).join("\n");
  const [topic, semantic, keyword] = await Promise.all([
    topicSearch(input.topics ?? []),
    semanticSearch(query).catch((err) => {
      console.error("[bible] semantic search failed, using keywords", err);
      return { refs: [] as Ref[], tokens: 0 };
    }),
    keywordSearch(input.message),
  ]);

  const out: Ref[] = [];
  // Interleave so one source can't crowd the others out
  const sources = [explicit, topic, semantic.refs, keyword];
  for (let i = 0; out.length < limit && sources.some((s) => i < s.length); i++) {
    for (const s of sources) {
      const ref = s[i];
      if (ref && out.length < limit && !out.some((o) => overlaps(o, ref))) out.push(ref);
    }
  }
  return { refs: out, embedTokens: semantic.tokens };
}
