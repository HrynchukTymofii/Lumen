import type { NextRequest } from "next/server";
import { handle } from "@/lib/api";
import { BIBLE_CACHE, translationParam } from "@/lib/bible/params";
import { listBooks } from "@/lib/bible/passages";

// GET /api/bible/books?t=WEB → books in that translation with chapter counts (SPEC §6.8)
export const GET = handle(async (req: NextRequest) => {
  const translation = translationParam.parse(req.nextUrl.searchParams.get("t") ?? undefined);
  return Response.json({ translation, books: await listBooks(translation) }, { headers: { "Cache-Control": BIBLE_CACHE } });
});
