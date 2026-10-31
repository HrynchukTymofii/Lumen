import type { NextRequest } from "next/server";
import { z } from "zod";
import { hashCode, newCode } from "@/lib/admin-auth";
import { handle, readJson } from "@/lib/api";
import { CODE_TTL_MS, hashToken, newLinkToken, normalizeEmail } from "@/lib/auth/users";
import { sendLoginEmail } from "@/lib/email";
import { prisma } from "@/lib/prisma";
import { SITE } from "@/lib/site";

const body = z.object({ email: z.string().email().max(200), next: z.string().max(200).optional() });
const MAX_PER_HOUR = 5;

// Emails a 6-digit code and a sign-in link. Same reply for every email, so it can't be used to find accounts.
export const POST = handle(async (req: NextRequest) => {
  const input = body.parse(await readJson(req));
  const email = normalizeEmail(input.email);

  const recent = await prisma.loginToken.count({
    where: { email, purpose: "email_code", createdAt: { gt: new Date(Date.now() - 60 * 60 * 1000) } },
  });
  if (recent < MAX_PER_HOUR) {
    const code = newCode();
    const token = newLinkToken();
    const user = await prisma.user.findUnique({ where: { email }, select: { id: true } });
    await prisma.loginToken.create({
      data: {
        purpose: "email_code",
        email,
        userId: user?.id,
        codeHash: hashCode(code),
        tokenHash: hashToken(token),
        expiresAt: new Date(Date.now() + CODE_TTL_MS),
      },
    });
    const next = input.next?.startsWith("/app") ? `&next=${encodeURIComponent(input.next)}` : "";
    await sendLoginEmail(email, code, `${SITE.url}/app/login?token=${token}${next}`);
  }
  return Response.json({ ok: true });
});
