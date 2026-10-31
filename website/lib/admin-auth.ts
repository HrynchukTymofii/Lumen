import { createHash, randomInt, timingSafeEqual } from "node:crypto";
import { SignJWT, jwtVerify } from "jose";
import type { NextRequest } from "next/server";

export const ADMIN_COOKIE = "admin_session";
const SESSION_HOURS = 12;

function secret() {
  const value = process.env.ADMIN_JWT_SECRET;
  if (!value || value.length < 16) throw new Error("ADMIN_JWT_SECRET is missing or too short");
  return new TextEncoder().encode(value);
}

export function isAdminEmail(email: string) {
  const allowed = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return allowed.includes(email.trim().toLowerCase());
}

export const hashCode = (code: string) => createHash("sha256").update(code).digest("hex");

export function newCode() {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

export function sameHash(a: string, b: string) {
  const x = Buffer.from(a, "hex");
  const y = Buffer.from(b, "hex");
  return x.length === y.length && timingSafeEqual(x, y);
}

export async function signAdminSession(email: string) {
  return new SignJWT({ email, role: "admin" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_HOURS}h`)
    .sign(secret());
}

export const sessionCookie = (token: string) => ({
  name: ADMIN_COOKIE,
  value: token,
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: SESSION_HOURS * 60 * 60,
});

export async function verifyAdminToken(token: string | undefined): Promise<{ email: string } | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    const email = typeof payload.email === "string" ? payload.email : null;
    // Re-check the allowlist so removing an email locks that person out immediately
    if (payload.role !== "admin" || !email || !isAdminEmail(email)) return null;
    return { email };
  } catch {
    return null;
  }
}

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
    public extra?: Record<string, unknown>,
  ) {
    super(message);
  }
}

// Every /api/admin route calls this first; the proxy check alone is not authorization.
export async function requireAdmin(req: NextRequest) {
  const admin = await verifyAdminToken(req.cookies.get(ADMIN_COOKIE)?.value);
  if (!admin) throw new HttpError(401, "Not signed in");
  return admin;
}
