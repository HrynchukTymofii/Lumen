import type { NextRequest } from "next/server";
import { z } from "zod";
import { HttpError } from "@/lib/admin-auth";
import { handle, readJson } from "@/lib/api";
import { reply, screen } from "@/lib/ai/companion";
import { companionUser, rateLimited } from "@/lib/ai/user";
import { ownConversation, setTitleIfMissing } from "@/lib/chat";
import { sseResponse } from "@/lib/sse";

export const maxDuration = 60;

const body = z.object({
  text: z.string().trim().min(1).max(1000),
  quickPrompt: z.string().max(40).optional(), // which quick prompt chip started it, for analytics
});

// POST /api/chat/conversations/:id/messages → SSE (SPEC §6.6):
//   meta { category, quota } → delta { text }… → done { messageId, citations }
//   or blocked { category, text, resources? } for off-topic, jailbreak, abuse and crisis messages
// Errors before the stream: 403 ai_disabled, 402 quota, 429 too fast.
export const POST = handle(async (req: NextRequest, ctx: RouteContext<"/api/chat/conversations/[id]/messages">) => {
  const { user, premium } = await companionUser(req);
  const { id } = await ctx.params;
  const input = body.parse(await readJson(req));

  if (!user.aiEnabled) throw new HttpError(403, "The companion is turned off in Settings", { code: "ai_disabled" });
  await ownConversation(user.id, id);
  if (rateLimited(`chat:${user.id}`, 20)) throw new HttpError(429, "You're sending messages very fast. Please wait a moment.");

  const screened = await screen(user, input.text, premium);
  // Crisis replies are never held back by the quota; fixed replies don't use it
  if (screened.category === "on_topic" && screened.quota.used >= screened.quota.limit) {
    throw new HttpError(402, "You've used today's messages.", { code: "quota", quota: screened.quota, premium });
  }

  await setTitleIfMissing(id, input.text);
  return sseResponse(
    reply({
      user,
      conversationId: id,
      text: input.text,
      category: screened.category,
      topics: screened.topics,
      quota: screened.quota,
      signal: req.signal,
    }),
  );
});
