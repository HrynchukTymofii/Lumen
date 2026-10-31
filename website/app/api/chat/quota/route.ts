import type { NextRequest } from "next/server";
import { handle } from "@/lib/api";
import { getQuota } from "@/lib/ai/companion";
import { companionUser } from "@/lib/ai/user";

// GET /api/chat/quota → { used, limit, date, premium } ("3 of 5 messages left today")
export const GET = handle(async (req: NextRequest) => {
  const { user, premium } = await companionUser(req);
  return Response.json({ ...(await getQuota(user, premium)), premium });
});
