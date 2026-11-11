import type { NextRequest } from "next/server";
import { HttpError } from "@/lib/admin-auth";
import { handle } from "@/lib/api";
import { getSessionFromRequest } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { STREAK_USER, getStreak, localDate } from "@/lib/streak";
import { fallbackPrayer } from "@/funnels/plan";
import { verseOfDay } from "@/lib/bible/verse-of-day";

// The app's Today tab (SPEC §6.5), same prayer and verse as the web Today page. v0: the daily prayer is the
// template prayer for the user's answers and the verse of the day rotates through the hand-picked verses, in the user's translation (KJV signed out).
// GET /api/today → { date, prayer: { title, text, citations }, verse: { ref, text, translation }, streak }
// Without a sign-in (someone trying the app first) it answers too: the general prayer, the verse for the day in
// ?tz= (the phone's timezone), and streak null.

// Days since 1970 in that day, so the verse changes at the person's midnight
const dayNumber = (date: string) => Math.round(Date.parse(`${date}T00:00:00Z`) / 86_400_000);

function validTimezone(tz: string | null) {
  if (!tz) return null;
  try {
    localDate(tz);
    return tz;
  } catch {
    return null;
  }
}

export const GET = handle(async (req: NextRequest) => {
  const session = await getSessionFromRequest(req);
  if (!session) {
    const date = localDate(validTimezone(req.nextUrl.searchParams.get("tz")) ?? "America/New_York");
    return Response.json(
      { date, prayer: fallbackPrayer({}), verse: await verseOfDay(dayNumber(date), "KJV"), streak: null },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  }
  const user = await prisma.user.findUnique({
    where: { id: session.id },
    select: { ...STREAK_USER, firstName: true, struggles: true, translation: true },
  });
  if (!user) throw new HttpError(401, "Account not found");

  const streak = await getStreak(user);
  const verse = await verseOfDay(dayNumber(streak.today), user.translation);

  return Response.json(
    {
      date: streak.today,
      prayer: fallbackPrayer({ struggles: user.struggles, firstName: user.firstName ?? undefined }),
      verse,
      streak,
    },
    { headers: { "Cache-Control": "private, no-store" } },
  );
});
