import { HttpError } from "@/lib/admin-auth";
import { handle } from "@/lib/api";
import { BIBLE_CACHE, translationParam } from "@/lib/bible/params";
import { getChapter } from "@/lib/bible/passages";

// GET /api/bible/WEB/Phil/4 → { book, chapter, translation, verses: [{ v, text }], prev, next } (SPEC §6.8)
export const GET = handle(async (_req: Request, ctx: RouteContext<"/api/bible/[translation]/[book]/[chapter]">) => {
  const { translation, book, chapter } = await ctx.params;
  const n = Number(chapter);
  const data = Number.isInteger(n) && n > 0 ? await getChapter(translationParam.parse(translation.toUpperCase()), book, n) : null;
  if (!data) throw new HttpError(404, "Chapter not found");
  return Response.json(data, { headers: { "Cache-Control": BIBLE_CACHE } });
});
