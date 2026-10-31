import { NextResponse } from "next/server";
import { USER_COOKIE } from "@/lib/auth/session";

// Web: clears the cookie. The app just forgets its token (JWTs are stateless).
export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(USER_COOKIE);
  return res;
}
