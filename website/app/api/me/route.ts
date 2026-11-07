import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { HttpError } from "@/lib/admin-auth";
import { handle, readJson } from "@/lib/api";
import { revokeAppleToken } from "@/lib/auth/apple";
import { USER_COOKIE, getRefreshedToken, requireUser } from "@/lib/auth/session";
import { publicUser } from "@/lib/auth/users";
import { getPremium } from "@/lib/entitlement";
import { prisma } from "@/lib/prisma";

async function loadUser(id: string) {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw new HttpError(401, "Account not found"); // deleted while the token was still valid
  return user;
}

// SPEC §6.4. The app also gets a fresh token in x-refreshed-token once its token is a day old (PDR_pl pattern).
export const GET = handle(async (req: NextRequest) => {
  const session = await requireUser(req);
  const user = await loadUser(session.id);
  const premium = await getPremium(user.id);

  const res = NextResponse.json({
    user: publicUser(user),
    premium: premium
      ? { active: true, source: premium.source, productId: premium.productId, status: premium.status, currentPeriodEnd: premium.currentPeriodEnd }
      : { active: false },
  });
  const refreshed = await getRefreshedToken(req, session);
  if (refreshed) res.headers.set("x-refreshed-token", refreshed);
  return res;
});

function validTimezone(tz: string) {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

const patch = z
  .object({
    firstName: z.string().trim().max(40).nullable(),
    denomination: z.enum(["catholic", "protestant", "orthodox", "not_sure", "exploring"]).nullable(),
    translation: z.enum(["WEB", "KJV", "DRA", "BSB"]),
    aiEnabled: z.boolean(),
    weeklyGoal: z.number().int().min(3).max(7),
    streakHidden: z.boolean(),
    // "07:30", local time; the phone schedules the reminders (morning and evening)
    reminderTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).nullable(),
    eveningReminderTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).nullable(),
    remindersEnabled: z.boolean(),
    timezone: z.string().max(60).refine(validTimezone, "Unknown timezone"),
  })
  .partial();

export const PATCH = handle(async (req: NextRequest) => {
  const session = await requireUser(req);
  const data = patch.parse(await readJson(req));
  const user = await prisma.user.update({
    where: { id: session.id },
    data: {
      ...data,
      // An empty name clears it; leaving the field out keeps it
      ...(data.firstName !== undefined && { firstName: data.firstName || null }),
    },
  });
  return NextResponse.json({ user: publicUser(user) });
});

// Account deletion (App Store requirement): deletes everything (cascade). Store subscriptions can only be cancelled
// by the user in the App Store / Google Play; the app and website remind them.
export const DELETE = handle(async (req: NextRequest) => {
  const session = await requireUser(req);
  const user = await loadUser(session.id);

  // Sign in with Apple: the app's access to the Apple ID goes with the account (App Store guideline 5.1.1(v))
  if (user.appleRefreshToken) {
    await revokeAppleToken(user.appleRefreshToken).catch((err) => console.error("[delete account] apple revoke", err));
  }
  await prisma.user.delete({ where: { id: user.id } });

  const res = NextResponse.json({ ok: true });
  res.cookies.delete(USER_COOKIE);
  return res;
});
