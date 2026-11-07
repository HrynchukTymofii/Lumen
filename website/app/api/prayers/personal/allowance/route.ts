import type { NextRequest } from "next/server";
import { handle } from "@/lib/api";
import { companionUser } from "@/lib/ai/user";
import { freeAudioLeft, generatorQuota } from "@/lib/prayers/personal";

// GET /api/prayers/personal/allowance → { premium, generated: { used, limit, per, resetsOn }, tokens, freeAudioLeft }
export const GET = handle(async (req: NextRequest) => {
  const { user, premium } = await companionUser(req);
  const [generated, freeLeft] = await Promise.all([generatorQuota(user, premium), freeAudioLeft(user, premium)]);
  return Response.json({ premium, generated, tokens: user.prayerTokens, freeAudioLeft: freeLeft });
});
