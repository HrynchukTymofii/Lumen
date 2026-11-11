import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { handle, readJson } from "@/lib/api";
import { requireUser } from "@/lib/auth/session";
import { publicUser, remindersFor } from "@/lib/auth/users";
import { prisma } from "@/lib/prisma";
import { funnels } from "@/funnels";
import { aiComfortOf, answersSchema, denominationOf, shareNote, translationOf } from "@/funnels/answers";

const utm = z.string().trim().max(200).optional();
const body = z.object({
  answers: answersSchema,
  // The web funnel, when it's finished by someone already signed in (Google, Apple, or an earlier sign-in)
  funnelSlug: z.string().refine((s) => s in funnels, "Unknown funnel").optional(),
  paywallVariant: z.enum(["A", "B"]).optional(),
  marketingOptIn: z.boolean().optional(),
  utm: z.object({ source: utm, medium: utm, campaign: utm, content: utm, term: utm }).optional(),
  // Faith and what someone is carrying are special-category data (GDPR art. 9): stored only with consent
  sensitiveConsent: z.boolean().default(false),
});

// In-app quiz answers (SPEC §6.4, onboarding Path B). Same answers as the web funnel; only the ones given are
// written, so a second run of the quiz never wipes earlier answers with blanks.
export const POST = handle(async (req: NextRequest) => {
  const session = await requireUser(req);
  const { answers: a, sensitiveConsent, funnelSlug, paywallVariant, marketingOptIn, utm: u } = body.parse(await readJson(req));

  const sensitive = sensitiveConsent
    ? {
        struggles: a.struggles,
        burden: a.burden,
        denomination: denominationOf(a.denomination),
        prayingFor: a.prayingFor,
        carryAlone: a.carryAlone,
        sensitiveConsentAt: new Date(),
      }
    : {};

  // "When would you like to pray?" sets the reminders, unless they were already set (by an earlier quiz or Settings)
  const current = await prisma.user.findUniqueOrThrow({
    where: { id: session.id },
    select: { reminderTime: true, eveningReminderTime: true, funnelSlug: true, utmSource: true, memorySummary: true },
  });
  const reminders = !current.reminderTime && !current.eveningReminderTime ? remindersFor(a.prayerTime) : null;
  // "Want to tell God more?" (web funnel): added to the companion's notes, with consent
  const note = sensitiveConsent ? shareNote(a.share) : undefined;

  const user = await prisma.user.update({
    where: { id: session.id },
    data: {
      ...sensitive,
      ...reminders,
      prayerFrequency: a.prayerFrequency,
      obstacles: a.obstacles,
      prayerTime: a.prayerTime,
      aiComfort: aiComfortOf(a.aiComfort),
      fewMinutes: a.fewMinutes,
      translation: translationOf(a),
      ...(note && { memorySummary: current.memorySummary ? `${current.memorySummary}
${note}` : note }),
      ...(a.firstName && { firstName: a.firstName }),
      // First funnel and first UTMs win, as at sign-up
      ...(funnelSlug && !current.funnelSlug && { funnelSlug, paywallVariant }),
      ...(marketingOptIn !== undefined && { marketingOptIn }),
      ...(u?.source &&
        !current.utmSource && { utmSource: u.source, utmMedium: u.medium, utmCampaign: u.campaign, utmContent: u.content, utmTerm: u.term }),
    },
  });
  return NextResponse.json({ user: publicUser(user) });
});
