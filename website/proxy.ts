import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_COOKIE, verifyAdminToken } from "@/lib/admin-auth";
import { USER_COOKIE, verifyUserToken } from "@/lib/auth/session";

// Optimistic gates for /admin and the web app (/app). Every API route still checks the session itself.
// Someone signed in goes straight to the web app from the homepage, the quiz and the sign-in page; the web app sends
// accounts that haven't answered the quiz back to it (app/(site)/app/(tabs)/layout.tsx, with ?account=1).
export async function proxy(req: NextRequest) {
  const { pathname, searchParams } = req.nextUrl;
  const signedIn = () => verifyUserToken(req.cookies.get(USER_COOKIE)?.value);

  if (pathname === "/" || pathname.startsWith("/f/")) {
    // ?account=1: a signed-in account sent to answer the quiz; ?step=: a link back to a step (the paywall)
    if (searchParams.has("account") || searchParams.has("step")) return NextResponse.next();
    return (await signedIn()) ? NextResponse.redirect(new URL("/app", req.url)) : NextResponse.next();
  }

  if (pathname === "/app" || pathname.startsWith("/app/")) {
    if (pathname === "/app/login") {
      // An emailed link (?token=) still signs in, even over another session
      if (searchParams.has("token") || !(await signedIn())) return NextResponse.next();
      const next = searchParams.get("next");
      return NextResponse.redirect(new URL(next?.startsWith("/app") ? next : "/app", req.url));
    }
    if (await signedIn()) return NextResponse.next();
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
  matcher: ["/", "/f/:path*", "/admin/:path*", "/api/admin/((?!auth/).*)", "/app", "/app/:path*"],
};
