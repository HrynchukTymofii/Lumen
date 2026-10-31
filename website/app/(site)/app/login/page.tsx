import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Light, Scene } from "@/components/kit";
import { SITE } from "@/lib/site";
import { LoginForm } from "./login-form";
import "../../_components/flow.css";

export const metadata: Metadata = { title: "Sign in", robots: { index: false } };

// Web app sign-in (email code), and the landing page of every emailed sign-in link (?token=).
// The phone app opens the same /app/login?token= links itself once universal links are set up (SPEC §5.4).
export default function LoginPage() {
  return (
    <main className="fn">
      <header className="fn-nav">
        <Link href="/" className="brand">
          <Light size={30} label={`${SITE.name} home`} />
          {SITE.name}
        </Link>
      </header>
      <div className="fn-landing">
        <Scene name="sky" />
        <div className="fn-card">
          <Suspense fallback={<p className="sub">Loading…</p>}>
            <LoginForm />
          </Suspense>
        </div>
      </div>
    </main>
  );
}
