import type { NextRequest } from "next/server";
import { HttpError } from "@/lib/admin-auth";
import { handle } from "@/lib/api";
import { BIBLE_CACHE, translationParam } from "@/lib/bible/params";
import { getPassage } from "@/lib/bible/passages";
import { parseRef } from "@/lib/bible/refs";

// GET /api/bible/passage?ref=Philippians%204:6-7&t=KJV → { ref, text, translation, bookId, chapter, verseStart, verseEnd }
// Used by verse chips (the verse sheet). `translation` says which text was really used (DRA Psalms fall back to WEB).
export const GET = handle(async (req: NextRequest) => {
  const params = req.nextUrl.searchParams;
  const ref = parseRef(params.get("ref") ?? "");
  if (!ref) throw new HttpError(400, "Unknown reference");
  const passage = await getPassage(ref, translationParam.parse(params.get("t") ?? undefined));
  if (!passage) throw new HttpError(404, "Passage not found");
  return Response.json(passage, { headers: { "Cache-Control": BIBLE_CACHE } });
});
