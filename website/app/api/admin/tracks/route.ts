import type { NextRequest } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin-auth";
import { handle, readJson } from "@/lib/api";
import { CATEGORIES, readVariants, trackInputSchema } from "@/lib/content";
import { prisma } from "@/lib/prisma";

const filters = z.object({
  status: z.enum(["draft", "review", "published", "archived"]).optional(),
  category: z.enum(CATEGORIES).optional(),
  q: z.string().max(80).optional(),
});

export const GET = handle(async (req: NextRequest) => {
  await requireAdmin(req);
  const f = filters.parse(Object.fromEntries(req.nextUrl.searchParams));
  const tracks = await prisma.audioTrack.findMany({
    where: {
      status: f.status ?? { not: "archived" },
      category: f.category,
      title: f.q ? { contains: f.q, mode: "insensitive" } : undefined,
    },
    orderBy: [{ updatedAt: "desc" }],
  });
  // The list only needs a summary of each length, not every line
  return Response.json({
    tracks: tracks.map(({ variants, ...t }) => ({
      ...t,
      variants: readVariants({ variants }).map((v) => ({ minutes: v.minutes, hasAudio: Boolean(v.url) })),
    })),
  });
});

export const POST = handle(async (req: NextRequest) => {
  await requireAdmin(req);
  const data = trackInputSchema.parse(await readJson(req));
  const track = await prisma.audioTrack.create({ data: { ...data, status: "draft" } });
  return Response.json({ track }, { status: 201 });
});
