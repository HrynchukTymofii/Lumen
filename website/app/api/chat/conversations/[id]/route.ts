import type { NextRequest } from "next/server";
import { handle } from "@/lib/api";
import { companionUser } from "@/lib/ai/user";
import { deleteConversation, getConversation } from "@/lib/chat";

// GET → { id, title, messages: [{ id, role, text, category, createdAt, citations: [{ ref, text, translation, … }] }] }
export const GET = handle(async (req: NextRequest, ctx: RouteContext<"/api/chat/conversations/[id]">) => {
  const { user } = await companionUser(req);
  const { id } = await ctx.params;
  return Response.json(await getConversation(user.id, id, user.translation));
});

export const DELETE = handle(async (req: NextRequest, ctx: RouteContext<"/api/chat/conversations/[id]">) => {
  const { user } = await companionUser(req);
  const { id } = await ctx.params;
  await deleteConversation(user.id, id);
  return Response.json({ ok: true });
});
