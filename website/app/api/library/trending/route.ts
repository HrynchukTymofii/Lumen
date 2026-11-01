import { handle } from "@/lib/api";
import { getTrending } from "@/lib/streak";

// GET /api/library/trending → { ids: string[] }: the library tracks prayed most in the last 30 days, most first.
// Counts are across everyone, so the answer is the same for all users and can be cached for a while.
export const GET = handle(async () => {
  return Response.json({ ids: await getTrending() }, { headers: { "Cache-Control": "public, max-age=900" } });
});
