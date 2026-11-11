import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Wordmark } from "@/components/kit";
import { webSignInConfig } from "@/lib/auth/web-sign-in";
import { checkoutMode } from "@/lib/checkout";
import { SITE } from "@/lib/site";
import { funnels } from "@/funnels";
import { AccountLink } from "./account-link";
import { FunnelLoader } from "./funnel-loader";
import "../../_components/flow.css";

export const metadata: Metadata = { robots: { index: false } };

export function generateStaticParams() {
  return Object.keys(funnels).map((slug) => ({ slug }));
}

// Links to funnels that aren't built yet (/f/habit, /f/scripture) are redirected in next.config.ts, keeping UTMs
export default function FunnelPage({ params }: PageProps<"/f/[slug]">) {
  return (
    <div className="hh">
      <main className="fn">
        <header className="fn-nav">
          <Link href="/" className="brand" aria-label={`${SITE.name} home`}>
            <Wordmark />
          </Link>
          <AccountLink />
        </header>
        <Suspense fallback={<div className="fn-shell" aria-busy />}>
          <FunnelFor params={params} />
        </Suspense>
      </main>
    </div>
  );
}

async function FunnelFor({ params }: Pick<PageProps<"/f/[slug]">, "params">) {
  const { slug } = await params;
  if (!funnels[slug]) notFound();
  // Sign in with Google / Apple at the email step (public client ids, lib/auth/web-sign-in.ts)
  // How the paywall takes payment: CHECKOUT_MODE (lib/checkout.ts)
  return <FunnelLoader slug={slug} signIn={webSignInConfig()} mode={checkoutMode()} />;
}
