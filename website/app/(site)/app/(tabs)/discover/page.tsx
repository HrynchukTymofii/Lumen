import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Light, Scene } from "@/components/kit";
import { requirePageUser } from "@/lib/auth/current";
import { listBooks } from "@/lib/bible/passages";
import { getLibrary } from "@/lib/content";
import { getPremium } from "@/lib/entitlement";
import { categoryTitle } from "../prayers/categories";
import { Search } from "./search";

export const metadata: Metadata = { title: "Discover" };

// Discover, as in the app: search, then a grid of ways in (each category that has prayers, short prayers, the
// Bible, the companion, notes), then every prayer. Tiles appear as the catalog published in /admin grows.
export default function DiscoverPage() {
  return (
    <>
      <h1 className="wa-h1">Discover</h1>
      <Suspense fallback={<Light size={56} state="thinking" />}>
        <Discover />
      </Suspense>
    </>
  );
}

async function Discover() {
  const user = await requirePageUser("/app/discover");
  const unlocked = Boolean(await getPremium(user.id));
  const [{ tracks }, books] = await Promise.all([getLibrary(unlocked), listBooks(user.translation)]);

  // One tile per category with prayers, in catalog order, using its first prayer's art
  const firstOfCategory = new Map<string, { key: string; track: (typeof tracks)[number]; i: number }>();
  tracks.forEach((t, i) => firstOfCategory.has(t.category) || firstOfCategory.set(t.category, { key: t.category, track: t, i }));
  const quick = tracks.filter((t) => t.variants.some((v) => v.minutes === 1));

  return (
    <>
      <Search
        tracks={tracks.map((t) => ({ slug: t.slug, title: t.title, subtitle: t.subtitle, category: t.category, tags: t.tags, locked: t.locked }))}
        books={books.map((b) => ({ osis: b.osis, name: b.name, chapters: b.chapters }))}
        aiEnabled={user.aiEnabled}
      />

      <div className="wa-grid wa-sec">
        {[...firstOfCategory.values()].map(({ key, track, i }) => (
          <Link key={key} href={`/app/prayers?c=${key}`} className="wa-tile">
            <TileArt imageUrl={track.imageUrl} scene={track.scene} seed={i + 4} />
            <div className="t">{categoryTitle(key)}</div>
          </Link>
        ))}
        {quick.length >= 2 && (
          <Link href="/app/prayers?c=quick" className="wa-tile">
            <Scene name="golden" seed={21} noBigTrees />
            <div className="t">Quick prayers</div>
          </Link>
        )}
        <Link href="/app/bible" className="wa-tile">
          <Scene name="meadow" seed={5} />
          <div className="t">The Bible</div>
        </Link>
        {user.aiEnabled && (
          <Link href="/app/companion" className="wa-tile">
            <div className="art tile-light">
              <Scene name="sky" seed={9} noSun />
              <Light size={54} />
            </div>
            <div className="t">Ask the companion</div>
          </Link>
        )}
        <Link href="/app/bible/notes" className="wa-tile">
          <Scene name="dusk" seed={13} noBigTrees />
          <div className="t">Notes &amp; highlights</div>
        </Link>
      </div>

      <section className="wa-sec">
        {tracks.length > 0 ? (
          <>
            <div className="wa-row" style={{ marginBottom: 12 }}>
              <h2 style={{ fontSize: 22 }}>All prayers</h2>
              {tracks.length > 12 && <Link href="/app/prayers">See all {tracks.length}</Link>}
            </div>
            <div className="wa-card wa-list">
              {tracks.slice(0, 12).map((t, i) => (
                <Link key={t.id} href={`/app/prayers/${t.slug}`} className="wa-list-row track-row">
                  <span className="thumb">
                    <TileArt imageUrl={t.imageUrl} scene={t.scene} seed={i + 3} />
                  </span>
                  <span style={{ flex: 1 }}>
                    <b>{t.title}</b>
                    <small>
                      {t.variants.map((v) => v.minutes).join(" · ")} min · {categoryTitle(t.category)}
                    </small>
                  </span>
                  {t.locked && <span className="wa-lock static">Premium</span>}
                </Link>
              ))}
            </div>
          </>
        ) : (
          <div className="wa-card wa-empty">
            <Light size={56} />
            <p style={{ marginTop: 10 }}>The first guided prayers are being recorded. They&apos;ll appear here as soon as they&apos;re published.</p>
          </div>
        )}
      </section>
    </>
  );
}

/** A prayer's uploaded picture, or its drawn scene */
function TileArt({ imageUrl, scene, seed }: { imageUrl: string | null; scene: string; seed: number }) {
  if (imageUrl) {
    return (
      <div className="art">
        {/* eslint-disable-next-line @next/next/no-img-element -- R2 images, sized by CSS */}
        <img src={imageUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", position: "absolute", inset: 0 }} />
      </div>
    );
  }
  return <Scene name={scene} seed={seed} noBigTrees />;
}
