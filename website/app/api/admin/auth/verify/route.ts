import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { HttpError, hashCode, isAdminEmail, sameHash, sessionCookie, signAdminSession } from "@/lib/admin-auth";
import { handle, readJson } from "@/lib/api";
import { prisma } from "@/lib/prisma";

const body = z.object({ email: z.string().email().max(200), code: z.string().regex(/^\d{6}$/) });
const MAX_ATTEMPTS = 5;

export const POST = handle(async (req: NextRequest) => {
  const input = body.parse(await readJson(req));
  const email = input.email.trim().toLowerCase();
  const wrong = new HttpError(400, "That code is wrong or expired");
  if (!isAdminEmail(email)) throw wrong;

  const row = await prisma.adminLoginCode.findFirst({
    where: { email, usedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  });
  if (!row || row.attempts >= MAX_ATTEMPTS) throw wrong;

  if (!sameHash(row.codeHash, hashCode(input.code))) {
    await prisma.adminLoginCode.update({ where: { id: row.id }, data: { attempts: { increment: 1 } } });
    throw wrong;
  }
  await prisma.adminLoginCode.update({ where: { id: row.id }, data: { usedAt: new Date() } });

  const res = NextResponse.json({ ok: true, email });
  res.cookies.set(sessionCookie(await signAdminSession(email)));
  return res;
});
