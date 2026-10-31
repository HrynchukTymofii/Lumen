import type { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { handle, readJson } from "@/lib/api";
import { bumpContentVersion, pathPatchSchema } from "@/lib/content";
import { prisma } from "@/lib/prisma";

const withDays = {
  days: {
    orderBy: { day: "asc" as const },
    include: { track: { select: { id: true, title: true, status: true, category: true } } },
  },
};

export const GET = handle(async (req: NextRequest, ctx: RouteContext<"/api/admin/paths/[id]">) => {
  await requireAdmin(req);
  const { id } = await ctx.params;
  const path = await prisma.prayerPath.findUniqueOrThrow({ where: { id }, include: withDays });
  return Response.json({ path });
});

export const PATCH = handle(async (req: NextRequest, ctx: RouteContext<"/api/admin/paths/[id]">) => {
  await requireAdmin(req);
  const { id } = await ctx.params;
  const { trackIds, ...data } = pathPatchSchema.parse(await readJson(req));

  const path = await prisma.$transaction(async (tx) => {
    await tx.prayerPath.update({ where: { id }, data });
    if (trackIds) {
      // Days are rewritten as a whole: day 1..n in the order given
      await tx.prayerPathDay.deleteMany({ where: { pathId: id } });
      await tx.prayerPathDay.createMany({
        data: trackIds.map((trackId, i) => ({ pathId: id, day: i + 1, trackId })),
      });
    }
    return tx.prayerPath.findUniqueOrThrow({ where: { id }, include: withDays });
  });

  if (path.status === "published") await bumpContentVersion();
  return Response.json({ path });
});

export const DELETE = handle(async (req: NextRequest, ctx: RouteContext<"/api/admin/paths/[id]">) => {
  await requireAdmin(req);
  const { id } = await ctx.params;
  const path = await prisma.prayerPath.findUniqueOrThrow({ where: { id } });
  if (path.status === "published") {
    await prisma.prayerPath.update({ where: { id }, data: { status: "archived" } });
    await bumpContentVersion();
    return Response.json({ archived: true });
  }
  await prisma.prayerPath.delete({ where: { id } });
  return Response.json({ deleted: true });
});
