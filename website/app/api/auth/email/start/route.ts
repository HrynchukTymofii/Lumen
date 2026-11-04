import type { NextRequest } from "next/server";
import { z } from "zod";
import { handle, readJson } from "@/lib/api";
import { emailSignInCode } from "@/lib/auth/email-code";
import { isReviewEmail } from "@/lib/auth/review";
import { normalizeEmail } from "@/lib/auth/users";

const body = z.object({ email: z.string().email().max(200), next: z.string().max(200).optional() });

// Emails a 6-digit code and a sign-in link. Same reply for every email, so it can't be used to find accounts.
export const POST = handle(async (req: NextRequest) => {
  const input = body.parse(await readJson(req));
  const email = normalizeEmail(input.email);
  // The store reviewers' account signs in with its fixed code (lib/auth/review.ts)
  if (isReviewEmail(email)) return Response.json({ ok: true });
  await emailSignInCode(email, input.next);
  return Response.json({ ok: true });
});
