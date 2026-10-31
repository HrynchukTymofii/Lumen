import type { NextRequest } from "next/server";
import { handle } from "@/lib/api";
import { companionUser } from "@/lib/ai/user";
import { createConversation, listConversations } from "@/lib/chat";

// GET /api/chat/conversations?cursor= → { conversations: [{ id, title, updatedAt }], nextCursor }
export const GET = handle(async (req: NextRequest) => {
  const { user } = await companionUser(req);
  return Response.json(await listConversations(user.id, req.nextUrl.searchParams.get("cursor") ?? undefined));
});

// POST /api/chat/conversations → { id }. The title comes from the first message.
export const POST = handle(async (req: NextRequest) => {
  const { user } = await companionUser(req);
  return Response.json(await createConversation(user.id), { status: 201 });
});
