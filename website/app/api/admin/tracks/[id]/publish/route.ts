import type { NextRequest } from "next/server";
import { HttpError, requireAdmin } from "@/lib/admin-auth";
import { handle } from "@/lib/api";
import { bumpContentVersion, publishProblems } from "@/lib/content";
import { prisma } from "@/lib/prisma";

// POST = publish (or schedule, if publishAt is in the future), DELETE = unpublish back to draft.
export const POST = handle(async (req: NextRequest, ctx: RouteContext<"/api/admin/tracks/[id]/publish">) => {
  await requireAdmin(req);
  const { id } = await ctx.params;
  const current = await prisma.audioTrack.findUniqueOrThrow({ where: { id } });

  const problems = publishProblems(current);
  if (problems.length) throw new HttpError(422, "Not ready to publish", { problems });

  const track = await prisma.audioTrack.update({ where: { id }, data: { status: "published" } });
  await bumpContentVersion();
  return Response.json({ track });
});

export const DELETE = handle(async (req: NextRequest, ctx: RouteContext<"/api/admin/tracks/[id]/publish">) => {
  await requireAdmin(req);
  const { id } = await ctx.params;
  const track = await prisma.audioTrack.update({ where: { id }, data: { status: "draft" } });
  await bumpContentVersion();
  return Response.json({ track });
});
