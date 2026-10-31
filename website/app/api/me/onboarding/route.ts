import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { handle, readJson } from "@/lib/api";
import { requireUser } from "@/lib/auth/session";
import { publicUser } from "@/lib/auth/users";
import type { AiComfort, Denomination } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { answersSchema } from "@/funnels/answers";

const body = z.object({
  answers: answersSchema,
  // Faith and what someone is carrying are special-category data (GDPR art. 9): stored only with consent
  sensitiveConsent: z.boolean().default(false),
});

// In-app quiz answers (SPEC §6.4, onboarding Path B). Same answers as the web funnel; only the ones given are
// written, so a second run of the quiz never wipes earlier answers with blanks.
export const POST = handle(async (req: NextRequest) => {
  const session = await requireUser(req);
  const { answers: a, sensitiveConsent } = body.parse(await readJson(req));

  const sensitive = sensitiveConsent
    ? {
        struggles: a.struggles,
        burden: a.burden,
        denomination: a.denomination as Denomination | undefined,
        sensitiveConsentAt: new Date(),
      }
    : {};

  const user = await prisma.user.update({
    where: { id: session.id },
    data: {
      ...sensitive,
      prayerFrequency: a.prayerFrequency,
      obstacles: a.obstacles,
      prayerTime: a.prayerTime,
      aiComfort: a.aiComfort as AiComfort | undefined,
      ...(a.firstName && { firstName: a.firstName }),
    },
  });
  return NextResponse.json({ user: publicUser(user) });
});
