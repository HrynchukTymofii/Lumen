import Link from "next/link";
import { Suspense } from "react";
import { ArrowIcon, BookIcon, Light, Scene } from "@/components/kit";
import { requirePageUser } from "@/lib/auth/current";
import { getPremium } from "@/lib/entitlement";
import { fallbackPrayer } from "@/funnels/plan";
import { VERSES } from "@/funnels/verses";

// Today (SPEC §10.2 / §8.9). v0: the daily prayer is the template prayer for the user's answers and the
// verse of the day rotates through the hand-picked WEB verses. The AI daily prayer + Bible tables replace both.
const ALL_VERSES = [...new Map(Object.values(VERSES).flat().map((v) => [v.ref, v])).values()];

export default function TodayPage() {
  return (
    <Suspense fallback={<Light size={64} state="thinking" />}>
      <Today />
    </Suspense>
  );
}

function greeting(hour: number) {
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

async function Today() {
  const user = await requirePageUser("/app");
  const premium = await getPremium(user.id);

  const now = new Date();
  const local = new Date(now.toLocaleString("en-US", { timeZone: user.timezone }));
  const dayNumber = Math.floor(local.getTime() / 86_400_000);
  const verse = ALL_VERSES[dayNumber % ALL_VERSES.length];
  const prayer = fallbackPrayer({ struggles: user.struggles, firstName: user.firstName ?? undefined });

  return (
    <>
      <div className="wa-row">
        <div>
          <h1 className="wa-h1">
            {greeting(local.getHours())}
            {user.firstName ? `, ${user.firstName}` : ""}
          </h1>
          <p className="wa-lead">{local.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</p>
        </div>
        <Light size={56} />
      </div>

      <section className="wa-hero">
        <Scene name={local.getHours() < 17 ? "dawn" : "evening"} />
        <div className="in">
          <span className="eyebrow">Today&apos;s prayer</span>
          <h2>{prayer.title}</h2>
          <div className="prayer-text" style={{ marginTop: 10 }}>
            {prayer.text.split(/\n{2,}/).map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
        </div>
      </section>

      <section className="wa-sec">
        <div className="wa-card bg-butter motif wa-verse">
          <span className="eyebrow">Verse of the day</span>
          <q>“{verse.text}”</q>
          <b style={{ fontSize: 13, display: "inline-flex", gap: 6, alignItems: "center" }}>
            <BookIcon />
            {verse.ref} · WEB
          </b>
        </div>
      </section>

      <section className="wa-sec">
        <div className="wa-card bg-lav motif">
          <span className="eyebrow">Companion</span>
          <h2 style={{ fontSize: 22, marginTop: 6 }}>Talk it through, with real verses</h2>
          <p style={{ marginTop: 6, lineHeight: 1.5, fontWeight: 600 }}>Ask about a passage or ask for a prayer. Opening on the web very soon.</p>
        </div>
        {!premium && (
          <div className="wa-card">
            <div className="wa-row">
              <div>
                <b>Try Premium free for 7 days</b>
                <p className="wa-lead" style={{ fontSize: 14 }}>
                  Personal prayers with audio, the full library, unlimited companion.
                </p>
              </div>
              <Link href="/app/upgrade" className="btn-ink sm">
                See plans
                <span className="dot">
                  <ArrowIcon />
                </span>
              </Link>
            </div>
          </div>
        )}
      </section>
    </>
  );
}
