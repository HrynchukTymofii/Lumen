import type { NextRequest } from "next/server";
import { handle } from "@/lib/api";
import { requireUser } from "@/lib/auth/session";
import { getJourney, streakUser } from "@/lib/streak";

// GET /api/journey → { weeks: [{ start, done, goal }] (last 8, oldest first), totals: { daysPrayed, prayers } }
export const GET = handle(async (req: NextRequest) => {
  const session = await requireUser(req);
  return Response.json(await getJourney(await streakUser(session.id)), { headers: { "Cache-Control": "private, no-store" } });
});
