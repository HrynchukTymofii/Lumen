import { createRemoteJWKSet, jwtVerify } from "jose";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { HttpError } from "@/lib/admin-auth";
import { handle, readJson } from "@/lib/api";
import { findOrCreateUser, loginResponse } from "@/lib/auth/users";

// Google sign-in from the app (copied from PDR_pl, adapted): verifies the ID token against Google's keys.
const googleKeys = createRemoteJWKSet(new URL("https://www.googleapis.com/oauth2/v3/certs"));

const body = z.object({ id_token: z.string().min(1), platform: z.enum(["ios", "android", "web"]).optional() });

export const POST = handle(async (req: NextRequest) => {
  const input = body.parse(await readJson(req));
  // iOS, Android and web each have their own client id; any of ours is fine
  const audience = (process.env.GOOGLE_CLIENT_ID ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  if (!audience.length) throw new HttpError(503, "Google sign-in is not configured");

  const { payload } = await jwtVerify(input.id_token, googleKeys, {
    issuer: ["https://accounts.google.com", "accounts.google.com"],
    audience,
  }).catch(() => {
    throw new HttpError(401, "Couldn't verify the Google sign-in");
  });
  const email = typeof payload.email === "string" ? payload.email : null;
  if (!email || payload.email_verified !== true || !payload.sub) throw new HttpError(400, "No verified email from Google");

  const { user, isNew } = await findOrCreateUser({
    email,
    googleSub: payload.sub,
    firstName: typeof payload.given_name === "string" ? payload.given_name : null,
    platform: input.platform,
  });
  return loginResponse(user, isNew);
});
