// The 73 books (66 + 7 deuterocanonical), with the names each data source uses (scripts/import-bible.ts)
// and the names people type ("Phil 4:6", "1 Cor 13", "Psalm 23"). Ids follow the common 1..66 order,
// then the deuterocanon 67..73, so Genesis = 1, Matthew = 40, Revelation = 66.
// No imports on purpose: the phone app may import this file too.

export type Testament = "OT" | "NT" | "DC";

export type BookInfo = {
  id: number;
  osis: string; // OSIS id, used in URLs: /api/bible/WEB/Phil/4
  name: string;
  testament: Testament;
  web: string; // book code in the eBible.org WEB "vpl" file
  scroll?: string; // book name in the scrollmapper KJV / DRC JSON, when it differs from `name`
  aliases?: string[];
};

export const BOOKS: BookInfo[] = [
  { id: 1, osis: "Gen", name: "Genesis", testament: "OT", web: "GEN", aliases: ["gn"] },
  { id: 2, osis: "Exod", name: "Exodus", testament: "OT", web: "EXO", aliases: ["ex"] },
  { id: 3, osis: "Lev", name: "Leviticus", testament: "OT", web: "LEV", aliases: ["lv"] },
  { id: 4, osis: "Num", name: "Numbers", testament: "OT", web: "NUM", aliases: ["nm"] },
  { id: 5, osis: "Deut", name: "Deuteronomy", testament: "OT", web: "DEU", aliases: ["dt"] },
  { id: 6, osis: "Josh", name: "Joshua", testament: "OT", web: "JOS" },
  { id: 7, osis: "Judg", name: "Judges", testament: "OT", web: "JDG", aliases: ["jdg"] },
  { id: 8, osis: "Ruth", name: "Ruth", testament: "OT", web: "RUT" },
  { id: 9, osis: "1Sam", name: "1 Samuel", testament: "OT", web: "1SA", scroll: "I Samuel" },
  { id: 10, osis: "2Sam", name: "2 Samuel", testament: "OT", web: "2SA", scroll: "II Samuel" },
  { id: 11, osis: "1Kgs", name: "1 Kings", testament: "OT", web: "1KI", scroll: "I Kings" },
  { id: 12, osis: "2Kgs", name: "2 Kings", testament: "OT", web: "2KI", scroll: "II Kings" },
  { id: 13, osis: "1Chr", name: "1 Chronicles", testament: "OT", web: "1CH", scroll: "I Chronicles" },
  { id: 14, osis: "2Chr", name: "2 Chronicles", testament: "OT", web: "2CH", scroll: "II Chronicles" },
  { id: 15, osis: "Ezra", name: "Ezra", testament: "OT", web: "EZR" },
  { id: 16, osis: "Neh", name: "Nehemiah", testament: "OT", web: "NEH" },
  { id: 17, osis: "Esth", name: "Esther", testament: "OT", web: "EST" },
  { id: 18, osis: "Job", name: "Job", testament: "OT", web: "JOB" },
  { id: 19, osis: "Ps", name: "Psalms", testament: "OT", web: "PSA", aliases: ["psalm", "psa", "pss"] },
  { id: 20, osis: "Prov", name: "Proverbs", testament: "OT", web: "PRO", aliases: ["prv"] },
  { id: 21, osis: "Eccl", name: "Ecclesiastes", testament: "OT", web: "ECC", aliases: ["qoheleth"] },
  { id: 22, osis: "Song", name: "Song of Songs", testament: "OT", web: "SOL", scroll: "Song of Solomon", aliases: ["canticles", "sos"] },
  { id: 23, osis: "Isa", name: "Isaiah", testament: "OT", web: "ISA" },
  { id: 24, osis: "Jer", name: "Jeremiah", testament: "OT", web: "JER" },
  { id: 25, osis: "Lam", name: "Lamentations", testament: "OT", web: "LAM" },
  { id: 26, osis: "Ezek", name: "Ezekiel", testament: "OT", web: "EZE", aliases: ["ezk"] },
  { id: 27, osis: "Dan", name: "Daniel", testament: "OT", web: "DAN", aliases: ["dn"] },
  { id: 28, osis: "Hos", name: "Hosea", testament: "OT", web: "HOS" },
  { id: 29, osis: "Joel", name: "Joel", testament: "OT", web: "JOE" },
  { id: 30, osis: "Amos", name: "Amos", testament: "OT", web: "AMO" },
  { id: 31, osis: "Obad", name: "Obadiah", testament: "OT", web: "OBA" },
  { id: 32, osis: "Jonah", name: "Jonah", testament: "OT", web: "JON" },
  { id: 33, osis: "Mic", name: "Micah", testament: "OT", web: "MIC" },
  { id: 34, osis: "Nah", name: "Nahum", testament: "OT", web: "NAH" },
  { id: 35, osis: "Hab", name: "Habakkuk", testament: "OT", web: "HAB" },
  { id: 36, osis: "Zeph", name: "Zephaniah", testament: "OT", web: "ZEP" },
  { id: 37, osis: "Hag", name: "Haggai", testament: "OT", web: "HAG" },
  { id: 38, osis: "Zech", name: "Zechariah", testament: "OT", web: "ZEC" },
  { id: 39, osis: "Mal", name: "Malachi", testament: "OT", web: "MAL" },
  { id: 40, osis: "Matt", name: "Matthew", testament: "NT", web: "MAT", aliases: ["mt"] },
  { id: 41, osis: "Mark", name: "Mark", testament: "NT", web: "MAR", aliases: ["mk", "mrk"] },
  { id: 42, osis: "Luke", name: "Luke", testament: "NT", web: "LUK", aliases: ["lk"] },
  { id: 43, osis: "John", name: "John", testament: "NT", web: "JOH", aliases: ["jn", "jhn"] },
  { id: 44, osis: "Acts", name: "Acts", testament: "NT", web: "ACT" },
  { id: 45, osis: "Rom", name: "Romans", testament: "NT", web: "ROM" },
  { id: 46, osis: "1Cor", name: "1 Corinthians", testament: "NT", web: "1CO", scroll: "I Corinthians" },
  { id: 47, osis: "2Cor", name: "2 Corinthians", testament: "NT", web: "2CO", scroll: "II Corinthians" },
  { id: 48, osis: "Gal", name: "Galatians", testament: "NT", web: "GAL" },
  { id: 49, osis: "Eph", name: "Ephesians", testament: "NT", web: "EPH" },
  { id: 50, osis: "Phil", name: "Philippians", testament: "NT", web: "PHI", aliases: ["php"] },
  { id: 51, osis: "Col", name: "Colossians", testament: "NT", web: "COL" },
  { id: 52, osis: "1Thess", name: "1 Thessalonians", testament: "NT", web: "1TH", scroll: "I Thessalonians" },
  { id: 53, osis: "2Thess", name: "2 Thessalonians", testament: "NT", web: "2TH", scroll: "II Thessalonians" },
  { id: 54, osis: "1Tim", name: "1 Timothy", testament: "NT", web: "1TI", scroll: "I Timothy" },
  { id: 55, osis: "2Tim", name: "2 Timothy", testament: "NT", web: "2TI", scroll: "II Timothy" },
  { id: 56, osis: "Titus", name: "Titus", testament: "NT", web: "TIT" },
  { id: 57, osis: "Phlm", name: "Philemon", testament: "NT", web: "PHM" },
  { id: 58, osis: "Heb", name: "Hebrews", testament: "NT", web: "HEB" },
  { id: 59, osis: "Jas", name: "James", testament: "NT", web: "JAM" },
  { id: 60, osis: "1Pet", name: "1 Peter", testament: "NT", web: "1PE", scroll: "I Peter" },
  { id: 61, osis: "2Pet", name: "2 Peter", testament: "NT", web: "2PE", scroll: "II Peter" },
  { id: 62, osis: "1John", name: "1 John", testament: "NT", web: "1JO", scroll: "I John" },
  { id: 63, osis: "2John", name: "2 John", testament: "NT", web: "2JO", scroll: "II John" },
  { id: 64, osis: "3John", name: "3 John", testament: "NT", web: "3JO", scroll: "III John" },
  { id: 65, osis: "Jude", name: "Jude", testament: "NT", web: "JUD" },
  { id: 66, osis: "Rev", name: "Revelation", testament: "NT", web: "REV", scroll: "Revelation of John", aliases: ["revelations", "apocalypse"] },
  { id: 67, osis: "Tob", name: "Tobit", testament: "DC", web: "TOB", aliases: ["tobias"] },
  { id: 68, osis: "Jdt", name: "Judith", testament: "DC", web: "JDT" },
  { id: 69, osis: "Wis", name: "Wisdom", testament: "DC", web: "WIS", aliases: ["wisdom of solomon"] },
  { id: 70, osis: "Sir", name: "Sirach", testament: "DC", web: "SIR", aliases: ["ecclesiasticus"] },
  { id: 71, osis: "Bar", name: "Baruch", testament: "DC", web: "BAR" },
  { id: 72, osis: "1Macc", name: "1 Maccabees", testament: "DC", web: "1MA", scroll: "I Maccabees" },
  { id: 73, osis: "2Macc", name: "2 Maccabees", testament: "DC", web: "2MA", scroll: "II Maccabees" },
];

export const bookById = new Map(BOOKS.map((b) => [b.id, b]));
export const bookByOsis = new Map(BOOKS.map((b) => [b.osis.toLowerCase(), b]));

const norm = (s: string) => s.toLowerCase().replace(/[.\s]+/g, " ").trim();

// Every way a book can be written → book: "1 Cor", "1cor", "I Corinthians", "first corinthians", "phil".
const LOOKUP = new Map<string, BookInfo>();
for (const b of BOOKS) {
  const names = [b.name, b.osis, b.scroll ?? "", ...(b.aliases ?? [])];
  const numbered = /^([123]) (.+)$/.exec(b.name);
  if (numbered) {
    const [, n, rest] = numbered;
    const roman = ["", "i", "ii", "iii"][Number(n)];
    const word = ["", "first", "second", "third"][Number(n)];
    // "1 Jn" uses John's short forms
    const base = BOOKS.find((x) => x.name === rest)?.aliases ?? [];
    for (const short of [rest, rest.slice(0, 2), rest.slice(0, 3), rest.slice(0, 4), b.osis.slice(1), ...base]) {
      names.push(`${n} ${short}`, `${n}${short}`, `${roman} ${short}`, `${word} ${short}`);
    }
  } else {
    names.push(b.name.slice(0, 3), b.name.slice(0, 4));
  }
  for (const name of names) if (name && !LOOKUP.has(norm(name))) LOOKUP.set(norm(name), b);
}
// Short forms that two books share: "Jud" is Jude (Judges is "Judg"), "Phi" is Philippians
LOOKUP.set("jud", bookById.get(65)!);
LOOKUP.set("phi", bookById.get(50)!);

export function findBook(name: string): BookInfo | null {
  return LOOKUP.get(norm(name)) ?? null;
}
