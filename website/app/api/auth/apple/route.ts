import { createRemoteJWKSet, jwtVerify } from "jose";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { HttpError } from "@/lib/admin-auth";
import { handle, readJson } from "@/lib/api";
import { appleRefreshToken } from "@/lib/auth/apple";
import { findOrCreateUser, loginResponse } from "@/lib/auth/users";
import { prisma } from "@/lib/prisma";

// Sign in with Apple from the app (copied from PDR_pl, adapted). jose caches Apple's keys.
const appleKeys = createRemoteJWKSet(new URL("https://appleid.apple.com/auth/keys"));

const body = z.object({
  id_token: z.string().min(1),
  firstName: z.string().max(60).optional(), // Apple sends the name only on the very first sign-in
  // One-time code, swapped for a refresh token so deleting the account can revoke it (lib/auth/apple.ts)
  authorizationCode: z.string().max(2000).optional(),
  platform: z.enum(["ios", "android", "web"]).optional(),
});

export const POST = handle(async (req: NextRequest) => {
  const input = body.parse(await readJson(req));
  const audience = process.env.APPLE_CLIENT_ID;
  if (!audience) throw new HttpError(503, "Sign in with Apple is not configured");

  const { payload } = await jwtVerify(input.id_token, appleKeys, { issuer: "https://appleid.apple.com", audience }).catch(
    () => {
      throw new HttpError(401, "Couldn't verify the Apple sign-in");
    },
  );
  // Only the email inside the verified token: one sent by the app could be anyone's
  const email = typeof payload.email === "string" ? payload.email : null;
  if (!email || !payload.sub) throw new HttpError(400, "No email from Apple");

  const { user, isNew } = await findOrCreateUser({
    email,
    appleSub: payload.sub,
    firstName: input.firstName,
    platform: input.platform ?? "ios",
  });
  if (input.authorizationCode) {
    try {
      const refreshToken = await appleRefreshToken(input.authorizationCode);
      if (refreshToken) await prisma.user.update({ where: { id: user.id }, data: { appleRefreshToken: refreshToken } });
    } catch (err) {
      // Signing in matters more than the token: it's only needed when the account is deleted
      console.error("[apple sign-in] token exchange", err);
    }
  }
  return loginResponse(user, isNew);
});
