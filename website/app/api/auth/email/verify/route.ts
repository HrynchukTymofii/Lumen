import type { NextRequest } from "next/server";
import { z } from "zod";
import { HttpError, hashCode, sameHash } from "@/lib/admin-auth";
import { handle, readJson } from "@/lib/api";
import { findOrCreateUser, loginResponse, normalizeEmail } from "@/lib/auth/users";
import { prisma } from "@/lib/prisma";

const body = z.object({
  email: z.string().email().max(200),
  code: z.string().regex(/^\d{6}$/),
  platform: z.enum(["ios", "android", "web"]).optional(),
});
const MAX_ATTEMPTS = 5;

// → { token, user, isNew } + pc_session cookie. 5 wrong tries burn the code.
export const POST = handle(async (req: NextRequest) => {
  const input = body.parse(await readJson(req));
  const email = normalizeEmail(input.email);
  const wrong = new HttpError(400, "That code is wrong or expired");

  const row = await prisma.loginToken.findFirst({
    where: { email, purpose: "email_code", usedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  });
  if (!row?.codeHash || row.attempts >= MAX_ATTEMPTS) throw wrong;

  if (!sameHash(row.codeHash, hashCode(input.code))) {
    await prisma.loginToken.update({ where: { id: row.id }, data: { attempts: { increment: 1 } } });
    throw wrong;
  }
  await prisma.loginToken.update({ where: { id: row.id }, data: { usedAt: new Date() } });

  const { user, isNew } = await findOrCreateUser({ email, platform: input.platform });
  return loginResponse(user, isNew);
});
