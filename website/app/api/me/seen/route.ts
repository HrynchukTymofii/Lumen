import type { NextRequest } from "next/server";
import { z } from "zod";
import { handle, readJson } from "@/lib/api";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

// POST /api/me/seen { appVersion, appBuild, platform }: the app sends it on launch and when it comes back after a
// few hours, so the user table shows which version and platform each person last used.
const body = z.object({
  appVersion: z.string().max(20).nullable(),
  appBuild: z.string().max(20).nullable(),
  platform: z.enum(["ios", "android"]),
});

export const POST = handle(async (req: NextRequest) => {
  const session = await requireUser(req);
  const { appVersion, appBuild, platform } = body.parse(await readJson(req));
  await prisma.user.update({
    where: { id: session.id },
    data: { appVersion, appBuild, lastPlatform: platform, lastSeenAt: new Date() },
  });
  return Response.json({ ok: true });
});
