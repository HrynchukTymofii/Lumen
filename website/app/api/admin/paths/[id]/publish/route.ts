import type { NextRequest } from "next/server";
import { HttpError, requireAdmin } from "@/lib/admin-auth";
import { handle } from "@/lib/api";
import { bumpContentVersion } from "@/lib/content";
import { prisma } from "@/lib/prisma";

export const POST = handle(async (req: NextRequest, ctx: RouteContext<"/api/admin/paths/[id]/publish">) => {
  await requireAdmin(req);
  const { id } = await ctx.params;
  const current = await prisma.prayerPath.findUniqueOrThrow({
    where: { id },
    include: { days: { include: { track: { select: { title: true, status: true } } } } },
  });

  const problems: string[] = [];
  if (current.days.length === 0) problems.push("Add at least one day.");
  for (const d of current.days) {
    if (d.track.status !== "published") problems.push(`Day ${d.day} (“${d.track.title}”) isn't published yet.`);
  }
  if (problems.length) throw new HttpError(422, "Not ready to publish", { problems });

  const path = await prisma.prayerPath.update({ where: { id }, data: { status: "published" } });
  await bumpContentVersion();
  return Response.json({ path });
});

export const DELETE = handle(async (req: NextRequest, ctx: RouteContext<"/api/admin/paths/[id]/publish">) => {
  await requireAdmin(req);
  const { id } = await ctx.params;
  const path = await prisma.prayerPath.update({ where: { id }, data: { status: "draft" } });
  await bumpContentVersion();
  return Response.json({ path });
});
