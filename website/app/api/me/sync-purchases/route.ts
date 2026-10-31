import type { NextRequest } from "next/server";
import { HttpError } from "@/lib/admin-auth";
import { handle } from "@/lib/api";
import { requireUser } from "@/lib/auth/session";
import { revenueCatConfigured, syncRevenueCat } from "@/lib/revenuecat";

// POST /api/me/sync-purchases → { ok }. The app calls it right after a purchase or restore, so access is
// instant even when the webhook is late (SPEC §6.4). Then it re-reads GET /api/me.
export const POST = handle(async (req: NextRequest) => {
  const session = await requireUser(req);
  if (!revenueCatConfigured()) throw new HttpError(503, "In-app purchases aren't set up on the server yet");
  await syncRevenueCat(session.id);
  return Response.json({ ok: true });
});
