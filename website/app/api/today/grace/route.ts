import type { NextRequest } from "next/server";
import { handle } from "@/lib/api";
import { requireUser } from "@/lib/auth/session";
import { applyGrace, streakUser } from "@/lib/streak";

// POST /api/today/grace → streak. Fills yesterday with this week's grace day (SPEC §6.5).
export const POST = handle(async (req: NextRequest) => {
  const session = await requireUser(req);
  return Response.json({ streak: await applyGrace(await streakUser(session.id)) });
});
