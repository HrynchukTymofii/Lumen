import type { Translation } from "@/lib/generated/prisma/client";
import { VERSES } from "@/funnels/verses";
import { getPassage } from "./passages";
import { parseRef } from "./refs";

// The verse of the day (the app's Today tab and the web Today page): one of the hand-picked verses, rotating daily,
// read from the Bible tables in the person's translation. If the lookup fails, the hand-picked WEB text is shown.
const ALL_VERSES = [...new Map(Object.values(VERSES).flat().map((v) => [v.ref, v])).values()];

export async function verseOfDay(dayNumber: number, translation: Translation) {
  const picked = ALL_VERSES[((dayNumber % ALL_VERSES.length) + ALL_VERSES.length) % ALL_VERSES.length];
  const ref = parseRef(picked.ref);
  const passage = ref ? await getPassage(ref, translation).catch(() => null) : null;
  return passage
    ? { ref: picked.ref, text: passage.text, translation: passage.translation }
    : { ref: picked.ref, text: picked.text, translation: "WEB" as Translation };
}
