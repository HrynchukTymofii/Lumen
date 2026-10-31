import type { NextRequest } from "next/server";
import { z } from "zod";
import { handle, readJson } from "@/lib/api";
import { LINK_TTL_MS, hashToken, loginResponse, newLinkToken, normalizeEmail } from "@/lib/auth/users";
import { sendWelcomeEmail } from "@/lib/email";
import type { AiComfort, Denomination } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { SITE } from "@/lib/site";
import { funnels } from "@/funnels";
import { answersSchema } from "@/funnels/answers";

const utm = z.string().trim().max(200).optional();
const body = z.object({
  email: z.string().email().max(200),
  funnelSlug: z.string().refine((s) => s in funnels, "Unknown funnel"),
  answers: answersSchema,
  sensitiveConsent: z.literal(true), // faith answers are special-category data: no consent, no storing
  marketingOptIn: z.boolean().default(false),
  paywallVariant: z.enum(["A", "B"]).optional(),
  utm: z.object({ source: utm, medium: utm, campaign: utm, content: utm, term: utm }).default({}),
});

// Email step of the funnel (SPEC §5.3 step 3): creates the account, saves the answers, signs this browser in
// (so checkout knows the user) and emails a link that opens the account in the web app or the phone app.
//
// Anyone can type any email here, so a session is only handed out for an account nobody has proven yet
// (never signed in, nothing bought). Its answers are replaced by this visitor's, so nothing earlier leaks.
// For a real existing account the reply is 409 and the owner gets the sign-in link by email instead.
export const POST = handle(async (req: NextRequest) => {
  const input = body.parse(await readJson(req));
  const email = normalizeEmail(input.email);
  const a = input.answers;

  const existing = await prisma.user.findUnique({ where: { email }, include: { entitlements: { select: { id: true } } } });
  const claimable = !existing || (!existing.emailVerifiedAt && existing.entitlements.length === 0);

  const fresh = {
    firstName: a.firstName || null,
    struggles: a.struggles ?? [],
    burden: a.burden ?? null,
    denomination: (a.denomination as Denomination | undefined) ?? null,
    prayerFrequency: a.prayerFrequency ?? null,
    obstacles: a.obstacles ?? [],
    prayerTime: a.prayerTime ?? null,
    aiComfort: (a.aiComfort as AiComfort | undefined) ?? null,
    sensitiveConsentAt: new Date(),
    marketingOptIn: input.marketingOptIn,
    funnelSlug: input.funnelSlug,
    paywallVariant: input.paywallVariant ?? null,
  };

  const user = !existing
    ? await prisma.user.create({
        data: {
          email,
          ...fresh,
          utmSource: input.utm.source,
          utmMedium: input.utm.medium,
          utmCampaign: input.utm.campaign,
          utmContent: input.utm.content,
          utmTerm: input.utm.term,
          signupPlatform: "web",
        },
      })
    : claimable
      ? await prisma.user.update({ where: { id: existing.id }, data: fresh })
      : existing;

  const token = newLinkToken();
  await prisma.loginToken.create({
    data: { purpose: "web_to_app", email, userId: user.id, tokenHash: hashToken(token), expiresAt: new Date(Date.now() + LINK_TTL_MS) },
  });
  await sendWelcomeEmail(email, claimable ? user.firstName : null, `${SITE.url}/app/login?token=${token}`).catch((err) =>
    console.error("[welcome email]", err),
  );

  if (!claimable) return Response.json({ error: "You already have an account. We emailed you a sign-in link.", code: "exists" }, { status: 409 });
  return loginResponse(user, !existing);
});
