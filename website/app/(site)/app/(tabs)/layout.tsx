import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Wordmark } from "@/components/kit";
import { getCurrentUser } from "@/lib/auth/current";
import { isOnboarded } from "@/lib/auth/users";
import { SITE } from "@/lib/site";
import { ONBOARDING_URL } from "@/funnels";
import { TabNav } from "./tab-nav";
import "../../_components/flow.css";
import "./webapp.css";

export const metadata: Metadata = { title: { default: "Today", template: `%s · ${SITE.name}` }, robots: { index: false } };

// Web app (SPEC §8.9): sidebar on desktop, bottom tabs on phones. proxy.ts sends signed-out visitors to /app/login;
// an account that hasn't answered the quiz yet is sent to it first (QuizGate).
export default function WebAppLayout({ children }: LayoutProps<"/app">) {
  return (
    <div className="wa hh">
      <aside className="wa-side">
        <Link href="/app" className="brand" aria-label={`${SITE.name} home`}>
          <Wordmark />
        </Link>
        <Suspense fallback={<nav className="wa-tabs" />}>
          <TabNav />
        </Suspense>
      </aside>
      <main className="wa-main">{children}</main>
      <Suspense fallback={null}>
        <QuizGate />
      </Suspense>
    </div>
  );
}

// A new Google/Apple/email account, or an app account that skipped the quiz: answer it first, minus the email step
async function QuizGate() {
  const user = await getCurrentUser();
  if (user && !isOnboarded(user)) redirect(ONBOARDING_URL);
  return null;
}
