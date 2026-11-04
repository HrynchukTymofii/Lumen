import { hashCode, newCode } from "@/lib/admin-auth";
import { CODE_TTL_MS, hashToken, newLinkToken, normalizeEmail } from "@/lib/auth/users";
import { sendLoginEmail } from "@/lib/email";
import { prisma } from "@/lib/prisma";
import { SITE } from "@/lib/site";

const MAX_PER_HOUR = 5;

// Emails a 6-digit sign-in code and a sign-in link (one email), at most 5 an hour per address. Used by the sign-in
// page (POST /api/auth/email/start) and by the funnel when the email already has an account, so the visitor can type
// the code right there. `next` is where the link lands in the web app.
export async function emailSignInCode(rawEmail: string, next?: string) {
  const email = normalizeEmail(rawEmail);
  const recent = await prisma.loginToken.count({
    where: { email, purpose: "email_code", createdAt: { gt: new Date(Date.now() - 60 * 60 * 1000) } },
  });
  if (recent >= MAX_PER_HOUR) return;

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
  const nextParam = next?.startsWith("/app") ? `&next=${encodeURIComponent(next)}` : "";
  await sendLoginEmail(email, code, `${SITE.url}/app/login?token=${token}${nextParam}`);
}
