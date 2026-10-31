import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_COOKIE, verifyAdminToken } from "@/lib/admin-auth";
import { USER_COOKIE, verifyUserToken } from "@/lib/auth/session";

// Optimistic gates for /admin and the web app (/app). Every API route still checks the session itself.
export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname === "/app" || pathname.startsWith("/app/")) {
    if (pathname === "/app/login") return NextResponse.next();
    if (await verifyUserToken(req.cookies.get(USER_COOKIE)?.value)) return NextResponse.next();
    const login = new URL("/app/login", req.url);
    login.searchParams.set("next", pathname);
    return NextResponse.redirect(login);
  }

  if (pathname === "/admin/login") return NextResponse.next();

  const admin = await verifyAdminToken(req.cookies.get(ADMIN_COOKIE)?.value);
  if (admin) return NextResponse.next();

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  const login = new URL("/admin/login", req.url);
  login.searchParams.set("next", pathname);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/((?!auth/).*)", "/app", "/app/:path*"],
};
