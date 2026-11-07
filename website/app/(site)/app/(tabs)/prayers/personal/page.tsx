import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Light } from "@/components/kit";
import { requirePageUser } from "@/lib/auth/current";
import { getPremium } from "@/lib/entitlement";
import { prisma } from "@/lib/prisma";
import { freeAudioLeft, prayerSummary } from "@/lib/prayers/personal";

export const metadata: Metadata = { title: "My prayers" };

// My prayers (as app/app/personal-prayer/index.tsx): written by the generator, saved from the companion, or edited.
export default function MyPrayersPage() {
  return (
    <Suspense fallback={<Light size={56} state="thinking" />}>
      <MyPrayers />
    </Suspense>
  );
}

async function MyPrayers() {
  const user = await requirePageUser("/app/prayers/personal");
  const premium = Boolean(await getPremium(user.id));
  const [rows, freeLeft] = await Promise.all([
    prisma.personalPrayer.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 200 }),
    freeAudioLeft(user, premium),
  ]);
  const prayers = rows.map(prayerSummary);

  return (
    <>
      <Link href="/app/discover" className="wa-back">
        ← Discover
      </Link>
      <div className="pp-head">
        <h1 className="wa-h1">My prayers</h1>
        <Link href="/app/prayers/personal/new" className="btn-ink sm">
          Write a prayer
        </Link>
      </div>
      <p className="wa-lead">Prayers written for what you’re carrying, and the ones you saved from the companion.</p>
      {(premium || user.prayerTokens > 0) && (
        <p className="pp-tokens">
          {user.prayerTokens} prayer {user.prayerTokens === 1 ? "token" : "tokens"}
          {freeLeft ? " · 1 free audio prayer this month" : ""}
        </p>
      )}

      {!prayers.length ? (
        <div className="wa-card wa-empty wa-sec">
          <Light size={64} />
          <p style={{ marginTop: 10 }}>Tell us what’s on your heart and we’ll write a prayer for it. Prayers you save from the companion show up here too.</p>
          <Link href="/app/prayers/personal/new" className="btn-ink sm" style={{ marginTop: 14 }}>
            Write my prayer
          </Link>
        </div>
      ) : (
        <div className="wa-card wa-list wa-sec">
          {prayers.map((p) => (
            <Link key={p.id} href={`/app/prayers/personal/${p.id}`} className="wa-list-row">
              <span>
                <b>{p.title}</b>
                <small className="pp-meta">
                  {p.createdAt.toLocaleDateString("en-US", { month: "short", day: "numeric" })} · {p.words} words
                  {p.hasAudio ? " · audio" : ""}
                  {p.source === "companion" ? " · from the companion" : ""}
                </small>
              </span>
              <span aria-hidden>›</span>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
