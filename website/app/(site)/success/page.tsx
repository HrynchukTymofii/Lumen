import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { MascotPill } from "@/components/kit";
import { getCurrentUser } from "@/lib/auth/current";
import { getPremium } from "@/lib/entitlement";
import { funnelPlan } from "@/lib/funnel-plans";
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
  const params = await searchParams;
  const user = await getCurrentUser();
  const premium = user ? Boolean(await getPremium(user.id)) : false;
  // After the funnel's Stripe-mode checkout (lib/checkout.ts), a mock-up for now: ?plan=w4&addon=1&demo=1
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const bought = funnelPlan(one(params.plan));
  const addon = one(params.addon) === "1";
  const demo = one(params.demo) === "1";

  return (
    <>
      <h1 className="lp-big">
        <span className="line">
          You&apos;re <MascotPill art="first" className="ipill" /> in{user?.firstName ? "," : "."}
        </span>
        {user?.firstName && <span className="line">{user.firstName}.</span>}
      </h1>
      <p className="lp-lead">
        {bought && !premium
          ? `Your plan is ready. Your 28-day journey starts today, and your companion will check in tomorrow.${
              addon ? " Your first personal audio prayer arrives tomorrow morning, and your lock-screen promise is waiting in the app." : ""
            }`
          : premium
            ? "Premium is active. Your prayer journey and today's prayer are waiting."
            : "Your free plan is ready: the Bible, the verse of the day and a daily prayer, forever."}
      </p>
      {bought && demo && !premium && <p className="fine">Demo checkout: no payment was taken.</p>}
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
