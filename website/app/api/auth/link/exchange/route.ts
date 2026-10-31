import type { NextRequest } from "next/server";
import { z } from "zod";
import { HttpError } from "@/lib/admin-auth";
import { handle, readJson } from "@/lib/api";
import { LINK_TTL_MS, findOrCreateUser, hashToken, loginResponse } from "@/lib/auth/users";
import { prisma } from "@/lib/prisma";

const body = z.object({ token: z.string().min(20).max(200), platform: z.enum(["ios", "android", "web"]).optional() });

// One-time links: the link in the sign-in email, and the web → app link from the success page / welcome email.
export const POST = handle(async (req: NextRequest) => {
  const input = body.parse(await readJson(req));
  const row = await prisma.loginToken.findUnique({ where: { tokenHash: hashToken(input.token) } });

  // A code row expires after 15 min, but its link works for 24 h from creation
  const expiresAt = row?.purpose === "email_code" ? new Date(row.createdAt.getTime() + LINK_TTL_MS) : row?.expiresAt;
  if (!row || row.usedAt || !expiresAt || expiresAt < new Date()) {
    throw new HttpError(400, "This link has expired or was already used. Ask for a new one.");
  }
  // Single use, even if two requests race
  const { count } = await prisma.loginToken.updateMany({ where: { id: row.id, usedAt: null }, data: { usedAt: new Date() } });
  if (count === 0) throw new HttpError(400, "This link was already used. Ask for a new one.");

  const { user, isNew } = await findOrCreateUser({ email: row.email, platform: input.platform });
  return loginResponse(user, isNew);
});
