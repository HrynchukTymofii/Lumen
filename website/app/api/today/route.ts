import type { NextRequest } from "next/server";
import { HttpError } from "@/lib/admin-auth";
import { handle } from "@/lib/api";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { STREAK_USER, getStreak } from "@/lib/streak";
import { fallbackPrayer } from "@/funnels/plan";
import { VERSES } from "@/funnels/verses";

// The app's Today tab (SPEC §6.5), same prayer and verse as the web Today page. v0: the daily prayer is the
// template prayer for the user's answers and the verse of the day rotates through the hand-picked WEB verses.
// GET /api/today → { date, prayer: { title, text, citations }, verse: { ref, text, translation }, streak }
const ALL_VERSES = [...new Map(Object.values(VERSES).flat().map((v) => [v.ref, v])).values()];

export const GET = handle(async (req: NextRequest) => {
  const session = await requireUser(req);
  const user = await prisma.user.findUnique({
    where: { id: session.id },
    select: { ...STREAK_USER, firstName: true, struggles: true },
  });
  if (!user) throw new HttpError(401, "Account not found");

  const streak = await getStreak(user);
  // Days since 1970 in the user's timezone, so the verse changes at their midnight
  const dayNumber = Math.round(Date.parse(`${streak.today}T00:00:00Z`) / 86_400_000);
  const verse = ALL_VERSES[dayNumber % ALL_VERSES.length];

  return Response.json(
    {
      date: streak.today,
      prayer: fallbackPrayer({ struggles: user.struggles, firstName: user.firstName ?? undefined }),
      verse: { ...verse, translation: "WEB" },
      streak,
    },
    { headers: { "Cache-Control": "private, no-store" } },
  );
});
