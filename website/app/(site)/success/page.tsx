import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ArrowIcon, Light, Scene } from "@/components/kit";
import { getCurrentUser } from "@/lib/auth/current";
import { getPremium } from "@/lib/entitlement";
import { SITE } from "@/lib/site";
import { stripeConfigured, getStripe } from "@/lib/stripe";
import { SiteFooter } from "../_components/chrome";

export const metadata: Metadata = { title: "You're in", robots: { index: false } };

// After checkout (or "continue free"): SPEC §8.5. The webhook may land a few seconds after this page,
// so a paid Stripe session counts as Premium here even before the entitlement row exists.
export default function SuccessPage({ searchParams }: PageProps<"/success">) {
  return (
    <main className="wrap">
      <section className="foot-cta" style={{ minHeight: 560, marginTop: 20 }}>
        <Scene name="golden" />
        <div className="in">
          <Suspense fallback={<Light size={72} state="celebrating" />}>
            <Welcome searchParams={searchParams} />
          </Suspense>
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}

async function Welcome({ searchParams }: Pick<PageProps<"/success">, "searchParams">) {
  const { session_id } = await searchParams;
  const user = await getCurrentUser();

  let premium = user ? Boolean(await getPremium(user.id)) : false;
  if (!premium && user && typeof session_id === "string" && stripeConfigured()) {
    const checkout = await getStripe()
      .checkout.sessions.retrieve(session_id)
      .catch(() => null);
    premium = checkout?.client_reference_id === user.id && checkout.status === "complete";
  }

  return (
    <>
      <Light size={72} state="celebrating" />
      <h2 style={{ marginTop: 10 }}>{user?.firstName ? `You're in, ${user.firstName}.` : "You're in."}</h2>
      <p>
        {premium
          ? "Premium is active. Your 7-day prayer path and today's prayer are waiting."
          : "Your free plan is ready: the Bible, the verse of the day and a daily prayer, forever."}
      </p>
      <Link href="/app" className="btn-ink full">
        Open {SITE.name}
        <span className="dot">
          <ArrowIcon />
        </span>
      </Link>
      <p className="fine" style={{ marginTop: 14 }}>
        {user ? `Sign in anywhere with ${user.email}. ` : ""}We also emailed you a link. The iPhone app is coming soon and
        uses the same account.
      </p>
    </>
  );
}
