import { bookById, findBook } from "./books";

// Bible references: parse what people and models write ("Phil 4:6-7", "Psalm 23", "1 John 1:9"),
// format them back ("Philippians 4:6–7").

export type Ref = { bookId: number; chapter: number; verseStart: number; verseEnd: number };

// A whole chapter ("Psalm 23") ends past the last verse of any chapter; queries clip it
export const WHOLE_CHAPTER_END = 200;

// Book part: an optional 1/2/3 or I/II/III, then a word (with "of …" for "Song of Songs"), optional dot.
// Whether the word is really a book is decided by findBook, so "May 5" or "chapter 3" are skipped.
const REF_RE =
  /\b((?:[123]|I{1,3})\s*)?([A-Za-z]+(?:\s+of\s+[A-Za-z]+)?)\.?\s+(\d{1,3})(?:\s*:\s*(\d{1,3})(?:\s*[-–—]\s*(\d{1,3}))?)?/g;

function toRef(m: RegExpMatchArray): Ref | null {
  const [, num, word, chapter, start, end] = m;
  const info = findBook(`${num ?? ""}${word}`) ?? (num ? null : findBook(word));
  if (!info) return null;
  const c = Number(chapter);
  const s = start ? Number(start) : 1;
  const e = end ? Number(end) : start ? s : WHOLE_CHAPTER_END;
  if (c < 1 || s < 1 || e < s) return null;
  return { bookId: info.id, chapter: c, verseStart: s, verseEnd: e };
}

/** One reference, e.g. "Philippians 4:6–7" → { bookId: 50, chapter: 4, verseStart: 6, verseEnd: 7 } */
export function parseRef(text: string): Ref | null {
  const m = [...text.trim().matchAll(REF_RE)];
  return m.length === 1 && m[0].index === 0 ? toRef(m[0]) : null;
}

/** Every reference mentioned in free text ("what does John 3:16 mean?"). Words that aren't books are skipped. */
export function findRefs(text: string): Ref[] {
  const out: Ref[] = [];
  const re = new RegExp(REF_RE.source, "g");
  for (let m = re.exec(text); m; m = re.exec(text)) {
    const ref = toRef(m);
    if (ref) out.push(ref);
    // Not a book ("is 1 Peter…" first matches "is 1"): look again from the next word, not after the number
    else re.lastIndex = m.index + 1;
  }
  return out;
}

export function formatRef(ref: Ref) {
  const book = bookById.get(ref.bookId)!;
  const whole = ref.verseStart === 1 && ref.verseEnd >= WHOLE_CHAPTER_END;
  const name = book.id === 19 ? "Psalm" : book.name;
  if (whole) return `${name} ${ref.chapter}`;
  const verses = ref.verseEnd > ref.verseStart ? `${ref.verseStart}–${ref.verseEnd}` : `${ref.verseStart}`;
  return `${name} ${ref.chapter}:${verses}`;
}
