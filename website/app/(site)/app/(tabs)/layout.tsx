import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Wordmark } from "@/components/kit";
import { SITE } from "@/lib/site";
import { TabNav } from "./tab-nav";
import "../../_components/flow.css";
import "./webapp.css";

export const metadata: Metadata = { title: { default: "Today", template: `%s · ${SITE.name}` }, robots: { index: false } };

// Web app (SPEC §8.9): sidebar on desktop, bottom tabs on phones. proxy.ts sends signed-out visitors to /app/login.
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
    </div>
  );
}
