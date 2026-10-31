import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ArrowIcon, Light, Scene } from "@/components/kit";
import { requirePageUser } from "@/lib/auth/current";
import { toPublicTrack } from "@/lib/content";
import { getPremium } from "@/lib/entitlement";
import { prisma } from "@/lib/prisma";

export default function PrayerPage({ params }: PageProps<"/app/prayers/[slug]">) {
  return (
    <Suspense fallback={<Light size={56} state="thinking" />}>
      <Prayer params={params} />
    </Suspense>
  );
}

async function Prayer({ params }: Pick<PageProps<"/app/prayers/[slug]">, "params">) {
  const { slug } = await params;
  const user = await requirePageUser(`/app/prayers/${slug}`);
  const row = await prisma.audioTrack.findUnique({ where: { slug } });
  if (!row || row.status !== "published" || (row.publishAt && row.publishAt > new Date())) notFound();

  const track = toPublicTrack(row, Boolean(await getPremium(user.id)));
  // The middle length reads best on a screen; the player with all lengths comes with the app's player screen
  const variant = track.variants.find((v) => v.minutes === 3) ?? track.variants[0];

  return (
    <>
      <Link href="/app/prayers" className="wa-lead" style={{ textDecoration: "none" }}>
        ← All prayers
      </Link>
      <section className="wa-hero">
        <Scene name={track.scene} />
        <div className="in">
          <span className="eyebrow">{track.category}</span>
          <h2>{track.title}</h2>
          {track.subtitle && <p className="wa-lead">{track.subtitle}</p>}
        </div>
      </section>

      <section className="wa-sec wa-card">
        {variant ? (
          <>
            <div className="prayer-text">
              {variant.lines.map((l, i) => (
                <p key={i}>{l.text}</p>
              ))}
            </div>
            {variant.url && <audio controls preload="none" src={variant.url} />}
          </>
        ) : (
          <p className="wa-lead">This prayer has no text yet.</p>
        )}
        {track.locked && (
          <div className="wa-row" style={{ marginTop: 18 }}>
            <b>The full prayer and audio are in Premium.</b>
            <Link href="/app/upgrade" className="btn-ink sm">
              Try free for 7 days
              <span className="dot">
                <ArrowIcon />
              </span>
            </Link>
          </div>
        )}
      </section>
    </>
  );
}
