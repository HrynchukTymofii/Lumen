import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Light, Scene } from "@/components/kit";
import { requirePageUser } from "@/lib/auth/current";
import { getLibrary } from "@/lib/content";
import { getPremium } from "@/lib/entitlement";

export const metadata: Metadata = { title: "Prayers" };

// The same catalog the phone app reads from /api/library (published in /admin).
export default function PrayersPage() {
  return (
    <>
      <h1 className="wa-h1">Prayers</h1>
      <p className="wa-lead">Guided prayers for every part of the day.</p>
      <Suspense fallback={<Light size={56} state="thinking" />}>
        <Library />
      </Suspense>
    </>
  );
}

async function Library() {
  const user = await requirePageUser("/app/prayers");
  const unlocked = Boolean(await getPremium(user.id));
  const { tracks } = await getLibrary(unlocked);

  if (!tracks.length) {
    return (
      <div className="wa-card wa-empty wa-sec">
        <Light size={56} />
        <p style={{ marginTop: 10 }}>The first guided prayers are being recorded. They&apos;ll appear here as soon as they&apos;re published.</p>
      </div>
    );
  }
  return (
    <div className="wa-grid wa-sec">
      {tracks.map((t, i) => (
        <Link key={t.id} href={`/app/prayers/${t.slug}`} className="wa-tile">
          <Scene name={t.scene} seed={i + 2} noBigTrees />
          {t.locked && <span className="wa-lock">Premium</span>}
          <div className="t">
            {t.title}
            <small>
              {t.variants.map((v) => `${v.minutes}`).join(" · ")} min · {t.category}
            </small>
          </div>
        </Link>
      ))}
    </div>
  );
}
