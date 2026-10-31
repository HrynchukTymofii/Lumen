import { createHash, randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { Platform, User } from "@/lib/generated/prisma/client";
import { signUserToken, userCookie } from "./session";

export const normalizeEmail = (email: string) => email.trim().toLowerCase();

export const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");
export const newLinkToken = () => randomBytes(32).toString("base64url");

export const LINK_TTL_MS = 24 * 60 * 60 * 1000;
export const CODE_TTL_MS = 15 * 60 * 1000;

// Matches by provider id first, then by email (PDR_pl pattern), and links the provider id to that account.
export async function findOrCreateUser(input: {
  email: string;
  appleSub?: string;
  googleSub?: string;
  firstName?: string | null;
  platform?: Platform;
}) {
  const email = normalizeEmail(input.email);
  const bySub = input.appleSub
    ? await prisma.user.findUnique({ where: { appleSub: input.appleSub } })
    : input.googleSub
      ? await prisma.user.findUnique({ where: { googleSub: input.googleSub } })
      : null;
  const existing = bySub ?? (await prisma.user.findUnique({ where: { email } }));

  if (existing) {
    const user = await prisma.user.update({
      where: { id: existing.id },
      data: {
        emailVerifiedAt: existing.emailVerifiedAt ?? new Date(),
        appleSub: existing.appleSub ?? input.appleSub,
        googleSub: existing.googleSub ?? input.googleSub,
        firstName: existing.firstName ?? input.firstName ?? undefined,
      },
    });
    return { user, isNew: false };
  }

  const user = await prisma.user.create({
    data: {
      email,
      emailVerifiedAt: new Date(),
      appleSub: input.appleSub,
      googleSub: input.googleSub,
      firstName: input.firstName || null,
      signupPlatform: input.platform ?? "web",
    },
  });
  return { user, isNew: true };
}

export function publicUser(user: User) {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    denomination: user.denomination,
    translation: user.translation,
    aiEnabled: user.aiEnabled,
    weeklyGoal: user.weeklyGoal,
    streakHidden: user.streakHidden,
    reminderTime: user.reminderTime,
    remindersEnabled: user.remindersEnabled,
  };
}

// One reply shape for every login method: the app keeps `token`, the web gets the cookie.
export async function loginResponse(user: User, isNew: boolean) {
  const token = await signUserToken({ id: user.id, email: user.email });
  const res = NextResponse.json({ token, user: publicUser(user), isNew });
  res.cookies.set(userCookie(token));
  return res;
}
