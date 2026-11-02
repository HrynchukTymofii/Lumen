import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ArrowIcon, Light, Scene } from "@/components/kit";
import { getCurrentUser } from "@/lib/auth/current";
import { getPremium } from "@/lib/entitlement";
import { SITE } from "@/lib/site";
import { SiteFooter } from "../_components/chrome";
import { StoreButtons } from "../_components/store-buttons";

export const metadata: Metadata = { title: "You're in", robots: { index: false } };

// After the funnel ("continue free"): SPEC §8.5. Premium is bought in the app, so this points to the stores too.
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
  await searchParams;
  const user = await getCurrentUser();
  const premium = user ? Boolean(await getPremium(user.id)) : false;

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
      <StoreButtons placement="success" />
      <p className="fine" style={{ marginTop: 14 }}>
        {user ? `Sign in to the app or the website with ${user.email}. ` : ""}We also emailed you a link. Premium is
        available in the app.
      </p>
    </>
  );
}
