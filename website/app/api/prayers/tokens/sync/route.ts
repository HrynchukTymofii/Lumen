import type { NextRequest } from "next/server";
import { HttpError } from "@/lib/admin-auth";
import { handle } from "@/lib/api";
import { requireUser } from "@/lib/auth/session";
import { revenueCatConfigured } from "@/lib/revenuecat";
import { grantPurchasedTokens } from "@/lib/tokens";

// POST /api/prayers/tokens/sync → { tokens }. The app calls it right after a token purchase, so the balance
// doesn't wait for the RevenueCat webhook. Each store transaction is granted once, whoever gets there first.
export const POST = handle(async (req: NextRequest) => {
  const { id } = await requireUser(req);
  if (!revenueCatConfigured()) throw new HttpError(503, "Purchases aren't set up yet (REVENUECAT_SECRET_KEY).");
  const tokens = await grantPurchasedTokens(id);
  if (tokens === null) throw new HttpError(401, "Account not found");
  return Response.json({ tokens });
});
