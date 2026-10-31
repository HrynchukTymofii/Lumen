import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Light } from "@/components/kit";
import { SITE } from "@/lib/site";
import { funnels } from "@/funnels";
import { FunnelLoader } from "./funnel-loader";
import "../../_components/flow.css";

export const metadata: Metadata = { robots: { index: false } };

export function generateStaticParams() {
  return Object.keys(funnels).map((slug) => ({ slug }));
}

// Links to funnels that aren't built yet (/f/habit, /f/scripture) are redirected in next.config.ts, keeping UTMs
export default function FunnelPage({ params }: PageProps<"/f/[slug]">) {
  return (
    <main className="fn">
      <header className="fn-nav">
        <Link href="/" className="brand">
          <Light size={30} label={`${SITE.name} home`} />
          {SITE.name}
        </Link>
      </header>
      <Suspense fallback={<div className="fn-shell" aria-busy />}>
        <FunnelFor params={params} />
      </Suspense>
    </main>
  );
}

async function FunnelFor({ params }: Pick<PageProps<"/f/[slug]">, "params">) {
  const { slug } = await params;
  if (!funnels[slug]) notFound();
  return <FunnelLoader slug={slug} />;
}
