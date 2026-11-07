import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Light, Scene } from "@/components/kit";
import { requirePageUser } from "@/lib/auth/current";
import { getLibrary } from "@/lib/content";
import { getPremium } from "@/lib/entitlement";
import { categoryTitle } from "./categories";

export const metadata: Metadata = { title: "Prayers" };

// Every prayer, or one category (?c=peace, ?c=quick for the 1-minute ones), opened from Discover.
// The same catalog the phone app reads from /api/library (published in /admin).
export default function PrayersPage(props: PageProps<"/app/prayers">) {
  return (
    <Suspense fallback={<Light size={56} state="thinking" />}>
      <Library {...props} />
    </Suspense>
  );
}

async function Library({ searchParams }: PageProps<"/app/prayers">) {
  const user = await requirePageUser("/app/prayers");
  const unlocked = Boolean(await getPremium(user.id));
  const { tracks: all } = await getLibrary(unlocked);
  const c = (await searchParams).c;
  const category = typeof c === "string" ? c : null;
  const tracks = !category
    ? all
    : category === "quick"
      ? all.filter((t) => t.variants.some((v) => v.minutes === 1))
      : all.filter((t) => t.category === category);

  return (
    <>
      <Link href="/app/discover" className="wa-back">
        ← Discover
      </Link>
      <h1 className="wa-h1">{category ? categoryTitle(category) : "All prayers"}</h1>
      <p className="wa-lead">Guided prayers for every part of the day.</p>
      <Link href="/app/prayers/personal" className="wa-card wa-list-row pp-mine wa-sec">
        <span>
          <b>My prayers</b>
          <small className="pp-meta">Prayers written for what you’re carrying</small>
        </span>
        <span aria-hidden>›</span>
      </Link>
      {!tracks.length ? (
        <div className="wa-card wa-empty wa-sec">
          <Light size={56} />
          <p style={{ marginTop: 10 }}>The first guided prayers are being recorded. They&apos;ll appear here as soon as they&apos;re published.</p>
        </div>
      ) : (
        <div className="wa-grid wa-sec">
          {tracks.map((t, i) => (
            <Link key={t.id} href={`/app/prayers/${t.slug}`} className="wa-tile">
              {t.imageUrl ? (
                <div className="art">
                  {/* eslint-disable-next-line @next/next/no-img-element -- R2 images, sized by CSS */}
                  <img src={t.imageUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", position: "absolute", inset: 0 }} />
                </div>
              ) : (
                <Scene name={t.scene} seed={i + 2} noBigTrees />
              )}
              {t.locked && <span className="wa-lock">Premium</span>}
              <div className="t">
                {t.title}
                <small>
                  {t.variants.map((v) => `${v.minutes}`).join(" · ")} min · {categoryTitle(t.category)}
                </small>
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
