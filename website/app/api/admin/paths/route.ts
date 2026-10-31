import type { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { handle, readJson } from "@/lib/api";
import { pathInputSchema } from "@/lib/content";
import { prisma } from "@/lib/prisma";

export const GET = handle(async (req: NextRequest) => {
  await requireAdmin(req);
  const paths = await prisma.prayerPath.findMany({
    where: { status: { not: "archived" } },
    orderBy: [{ order: "asc" }, { updatedAt: "desc" }],
    include: { _count: { select: { days: true } } },
  });
  return Response.json({ paths });
});

export const POST = handle(async (req: NextRequest) => {
  await requireAdmin(req);
  const data = pathInputSchema.parse(await readJson(req));
  const path = await prisma.prayerPath.create({ data: { ...data, status: "draft" } });
  return Response.json({ path }, { status: 201 });
});
