import { SignJWT, decodeJwt, jwtVerify } from "jose";
import type { NextRequest } from "next/server";
import { HttpError } from "@/lib/admin-auth";

// User sessions for the web and the app (SPEC §5): the same JWT, sent as a Bearer token by the app
// and kept in the httpOnly `pc_session` cookie on the web. Adapted from PDR_pl lib/jwt.ts + lib/expo-auth.ts.

export const USER_COOKIE = "pc_session";
const SESSION_DAYS = 60;
// Tokens older than this get replaced via the x-refreshed-token header, so active users never hit the expiry
const REFRESH_AFTER_SECONDS = 24 * 60 * 60;

export type SessionUser = { id: string; email: string };

function secret() {
  const value = process.env.JWT_SECRET;
  if (!value || value.length < 32) throw new Error("JWT_SECRET is missing or too short");
  return new TextEncoder().encode(value);
}

export async function signUserToken(user: SessionUser) {
  return new SignJWT({ id: user.id, email: user.email })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(secret());
}

export async function verifyUserToken(token: string | undefined | null): Promise<SessionUser | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    if (typeof payload.id !== "string" || typeof payload.email !== "string") return null;
    return { id: payload.id, email: payload.email };
  } catch {
    return null;
  }
}

export const userCookie = (token: string) => ({
  name: USER_COOKIE,
  value: token,
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: SESSION_DAYS * 24 * 60 * 60,
});

function bearer(req: NextRequest) {
  const header = req.headers.get("authorization");
  return header?.startsWith("Bearer ") ? header.slice(7) : null;
}

export function getSessionFromRequest(req: NextRequest) {
  return verifyUserToken(bearer(req) ?? req.cookies.get(USER_COOKIE)?.value);
}

// Every user API route calls this first (the proxy check alone is not authorization).
export async function requireUser(req: NextRequest) {
  const user = await getSessionFromRequest(req);
  if (!user) throw new HttpError(401, "Not signed in");
  return user;
}

// For the app: a fresh token when the Bearer token is older than a day. Call only after requireUser.
export async function getRefreshedToken(req: NextRequest, user: SessionUser) {
  const token = bearer(req);
  if (!token) return null;
  const { iat } = decodeJwt(token);
  if (!iat) return null;
  return Date.now() / 1000 - iat > REFRESH_AFTER_SECONDS ? signUserToken(user) : null;
}
