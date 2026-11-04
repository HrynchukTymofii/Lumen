import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { MascotPill } from "@/components/kit";
import { getCurrentUser } from "@/lib/auth/current";
import { getPremium } from "@/lib/entitlement";
import { SITE } from "@/lib/site";
import { SiteFooter, SiteNav } from "../_components/chrome";
import { StoreButtons } from "../_components/store-buttons";

export const metadata: Metadata = { title: "You're in", robots: { index: false } };

// After the funnel ("continue free"): SPEC §8.5. Premium is bought in the app, so this points to the stores too.
export default function SuccessPage({ searchParams }: PageProps<"/success">) {
  return (
    <div className="hh">
      <SiteNav />
      <main className="hh-success">
        <Suspense fallback={<h1 className="lp-big">You&apos;re in.</h1>}>
          <Welcome searchParams={searchParams} />
        </Suspense>
      </main>
      <SiteFooter />
    </div>
  );
}

async function Welcome({ searchParams }: Pick<PageProps<"/success">, "searchParams">) {
  await searchParams;
  const user = await getCurrentUser();
  const premium = user ? Boolean(await getPremium(user.id)) : false;

  return (
    <>
      <h1 className="lp-big">
        <span className="line">
          You&apos;re <MascotPill art="first" className="ipill" /> in{user?.firstName ? "," : "."}
        </span>
        {user?.firstName && <span className="line">{user.firstName}.</span>}
      </h1>
      <p className="lp-lead">
        {premium
          ? "Premium is active. Your 7-day prayer path and today's prayer are waiting."
          : "Your free plan is ready: the Bible, the verse of the day and a daily prayer, forever."}
      </p>
      <div className="actions">
        <Link href="/app" className="lp-btn">
          Open {SITE.name}
        </Link>
        <StoreButtons placement="success" />
      </div>
      <p className="fine">
        {user ? `Sign in to the app or the website with ${user.email}. ` : ""}We also emailed you a link. Premium is
        available in the app.
      </p>
    </>
  );
}
