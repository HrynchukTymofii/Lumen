import type { NextRequest } from "next/server";
import { z } from "zod";
import { handle, readJson } from "@/lib/api";
import { requireUser } from "@/lib/auth/session";
import { markPrayed, streakUser } from "@/lib/streak";

const body = z.object({ prayerId: z.string().max(64).optional() });

// POST /api/today/prayed { prayerId? } → streak. "Mark as prayed" and finishing a prayer in the player.
// Idempotent per local date (SPEC §6.5).
export const POST = handle(async (req: NextRequest) => {
  const session = await requireUser(req);
  const { prayerId } = body.parse(await readJson(req).catch(() => ({})));
  return Response.json({ streak: await markPrayed(await streakUser(session.id), prayerId) });
});
