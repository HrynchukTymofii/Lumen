import type { NextRequest } from "next/server";
import { z } from "zod";
import { handle, readJson } from "@/lib/api";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

// POST /api/me/rating { stars, moment, comment?, platform, appVersion }: the in-app "How is Lumen helping you?"
const body = z.object({
  stars: z.number().int().min(1).max(5),
  moment: z.enum(["prayer", "companion"]),
  comment: z.string().trim().max(1000).optional(),
  platform: z.enum(["ios", "android"]),
  appVersion: z.string().max(20).nullable(),
});

export const POST = handle(async (req: NextRequest) => {
  const session = await requireUser(req);
  const { comment, ...data } = body.parse(await readJson(req));
  await prisma.appRating.create({ data: { ...data, comment: comment || null, userId: session.id } });
  return Response.json({ ok: true });
});
