import Link from "next/link";
import { Suspense } from "react";
import { ArrowIcon, Light, Scene } from "@/components/kit";
import { requirePageUser } from "@/lib/auth/current";
import { getLibrary } from "@/lib/content";
import { getPremium } from "@/lib/entitlement";
import { getStreak, getTrending } from "@/lib/streak";
import { companionTopic } from "@/funnels/companion-topics";
import { fallbackPrayer } from "@/funnels/plan";
import { VERSES } from "@/funnels/verses";
import { categoryTitle } from "./prayers/categories";
import { MarkPrayed, TalkCard } from "./home";

// Today (SPEC §10.2 / §8.9), laid out like the phone's Home (app/app/(tabs)/today.tsx) on a wide screen: the greeting,
// big picture cards to start a prayer, topic chips, the prayer week as one row, the verse of the day and "Talk it
// through" side by side, today's written prayer, then shelves: Pray anytime, Trending and one per category, ordered
// by the time of day. v0: the daily prayer is the template prayer for the user's answers and the verse rotates
// through the hand-picked WEB verses.
const ALL_VERSES = [...new Map(Object.values(VERSES).flat().map((v) => [v.ref, v])).values()];

export default function TodayPage() {
  return (
    <Suspense fallback={<Light size={64} state="thinking" />}>
      <Today />
    </Suspense>
  );
}

const greeting = (hour: number) => (hour >= 4 && hour < 12 ? "Good morning" : hour >= 12 && hour < 17 ? "Good afternoon" : "Good evening");
const momentLabel = (hour: number) =>
  hour >= 4 && hour < 12 ? "For this morning" : hour >= 12 && hour < 17 ? "For this afternoon" : hour >= 17 && hour < 21 ? "For this evening" : "For tonight";

// Which categories lead, by time of day (same order as the app)
function categoryOrder(hour: number) {
  if (hour >= 20 || hour < 4) return ["sleep", "evening", "psalms", "peace", "grief", "family", "morning"];
  if (hour >= 17) return ["evening", "psalms", "peace", "sleep", "grief", "family", "morning"];
  return ["morning", "psalms", "peace", "family", "grief", "evening", "sleep"];
}

// Short chip names: "Peace & calm" → "Peace"
const CHIP_TITLES: Record<string, string> = { morning: "Morning", evening: "Evening", peace: "Peace", psalms: "Scripture", grief: "Grief", family: "Family", sleep: "Sleep" };
const LETTERS = ["M", "T", "W", "T", "F", "S", "S"];

type Track = Awaited<ReturnType<typeof getLibrary>>["tracks"][number];
const minutes = (t: Track) => {
  const m = [...new Set(t.variants.map((v) => v.minutes))].sort((a, b) => a - b);
  return m.length ? `${m.join(" · ")} min` : "";
};

async function Today() {
  const user = await requirePageUser("/app");
  const premium = await getPremium(user.id);
  const [{ tracks }, streak, trendingIds] = await Promise.all([getLibrary(Boolean(premium)), getStreak(user), getTrending().catch(() => [])]);

  const local = new Date(new Date().toLocaleString("en-US", { timeZone: user.timezone }));
  const hour = local.getHours();
  const dayNumber = Math.floor(local.getTime() / 86_400_000);
  const verse = ALL_VERSES[dayNumber % ALL_VERSES.length];
  const prayer = fallbackPrayer({ struggles: user.struggles, firstName: user.firstName ?? undefined });
  const topic = companionTopic(user.struggles);
  const name = user.firstName?.trim();

  // Big cards: prayers with audio first, the time of day's category first, rotating daily
  const order = categoryOrder(hour);
  const playable = tracks.filter((t) => t.variants.some((v) => v.url) || t.locked);
  const pool = playable.length ? playable : tracks;
  const shift = pool.length ? dayNumber % pool.length : 0;
  const featured = [...pool.slice(shift), ...pool.slice(0, shift)].sort((a, b) => order.indexOf(a.category) - order.indexOf(b.category)).slice(0, 3);

  const anytime = tracks
    .filter((t) => !t.locked)
    .sort((a, b) => Math.min(...a.variants.map((v) => v.minutes)) - Math.min(...b.variants.map((v) => v.minutes)))
    .slice(0, 10);
  const byId = new Map(tracks.map((t) => [t.id, t]));
  const trending = trendingIds.map((id) => byId.get(id)).filter((t): t is Track => Boolean(t));
  const shelves = order.map((key) => ({ key, tracks: tracks.filter((t) => t.category === key) })).filter((s) => s.tracks.length);

  const done = streak.doneThisWeek.filter(Boolean).length;
  const reached = done >= streak.goal;

  return (
    <div className="home">
      <div className="home-top">
        <h1 className="home-hello">
          {greeting(hour)}
          {name ? (
            <>
              ,<br />
              {name}.
            </>
          ) : (
            "."
          )}
        </h1>
        <Link href="/app/discover" className="round-btn" aria-label="Search">
          <svg width={19} height={19} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden>
            <circle cx="11" cy="11" r="7" />
            <path d="M20 20l-3.5-3.5" />
          </svg>
        </Link>
      </div>

      {/* Prayers to start with one click */}
      {featured.length > 0 && (
        <section className="home-cards" aria-label="Prayers to start with">
          {featured.map((t, i) => (
            <Link key={t.id} href={`/app/prayers/${t.slug}`} className="pc">
              <Art track={t} seed={i + 7} />
              <span className="pc-tag">{i === 0 ? momentLabel(hour) : categoryTitle(t.category)}</span>
              <span className="pc-meta">
                <span>
                  <b>{t.title}</b>
                  <small>
                    {t.locked ? "Premium" : minutes(t)} · {CHIP_TITLES[t.category] ?? categoryTitle(t.category)}
                    {t.subtitle ? ` · ${t.subtitle}` : ""}
                  </small>
                </span>
                <span className="pc-play" aria-hidden>
                  <svg width={20} height={20} viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" fill="#0e0e10" />
                  </svg>
                </span>
              </span>
            </Link>
          ))}
        </section>
      )}

      {/* Topics: each jumps to its shelf below */}
      {shelves.length > 0 && (
        <nav className="home-chips" aria-label="Topics">
          <a href="#anytime" className="on">
            For you
          </a>
          {shelves.map((s) => (
            <a key={s.key} href={`#shelf-${s.key}`}>
              {CHIP_TITLES[s.key] ?? categoryTitle(s.key)}
            </a>
          ))}
        </nav>
      )}

      {/* The prayer week: one row, as on the phone */}
      {!streak.hidden && (
        <section className="home-week" aria-label="Your prayer week">
          <div className="home-week-text">
            <b>{done === 0 ? "Your week" : `${done} ${done === 1 ? "day" : "days"} prayed this week`}</b>
            <small>{reached ? "Goal reached. Well done." : `Goal: ${streak.goal} days a week. Missed days never reset anything.`}</small>
          </div>
          <ol className="home-days">
            {streak.weekDays.map((day, i) => {
              const isDone = streak.doneThisWeek[i];
              const isToday = day === streak.today;
              return (
                <li key={day} className={`${isDone ? "done" : ""} ${isToday ? "today" : ""}`}>
                  <span>{LETTERS[i]}</span>
                  <i aria-label={`${day}${isDone ? ", prayed" : ""}`}>
                    {isDone && (
                      <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                        <path d="M5 12.5l4.5 4.5L19 7.5" />
                      </svg>
                    )}
                  </i>
                </li>
              );
            })}
          </ol>
        </section>
      )}

      {/* The verse of the day and the companion, side by side */}
      <section className={`home-pair ${user.aiEnabled ? "" : "one"}`}>
        <div className="home-box home-verse">
          <span className="lab">Verse of the day</span>
          <q>“{verse.text}”</q>
          <small>{verse.ref} · WEB</small>
        </div>
        {user.aiEnabled && <TalkCard line={topic.line} prompts={topic.prompts} />}
      </section>

      {/* Today's written prayer */}
      <section className="home-box home-prayer">
        <div className="home-prayer-head">
          <span className="lab">Written for you today</span>
          <Light size={30} />
        </div>
        <h2>{prayer.title}</h2>
        <div className="prayer-text">
          {prayer.text.split(/\n{2,}/).map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>
        <MarkPrayed prayed={streak.prayedToday} />
      </section>

      {/* Shelves, as on the phone */}
      <Shelf id="anytime" title="Pray anytime" tracks={anytime} href="/app/prayers" />
      {trending.length >= 3 && <Shelf id="trending" title="Trending" tracks={trending} />}
      {shelves.map((s) => (
        <Shelf key={s.key} id={`shelf-${s.key}`} title={categoryTitle(s.key)} tracks={s.tracks} href={`/app/prayers?c=${s.key}`} />
      ))}

      {tracks.length === 0 && (
        <div className="wa-card wa-empty wa-sec">
          <Light size={56} />
          <p style={{ marginTop: 10 }}>The first guided prayers are being recorded. They&apos;ll appear here as soon as they&apos;re published.</p>
        </div>
      )}

      {!premium && (
        <section className="home-box home-premium">
          <div>
            <b>Try Premium free for 7 days</b>
            <p>Personal prayers with audio, the full library, 200 companion messages a week.</p>
          </div>
          <Link href="/app/upgrade" className="btn-ink sm">
            See plans
            <span className="dot">
              <ArrowIcon />
            </span>
          </Link>
        </section>
      )}
    </div>
  );
}

function Shelf({ id, title, tracks, href }: { id: string; title: string; tracks: Track[]; href?: string }) {
  if (!tracks.length) return null;
  return (
    <section className="home-shelf" id={id}>
      <div className="home-shelf-head">
        <h2>{title}</h2>
        {href && <Link href={href}>See all</Link>}
      </div>
      <div className="home-row">
        {tracks.map((t, i) => (
          <Link key={t.id} href={`/app/prayers/${t.slug}`} className="poster">
            <Art track={t} seed={i + 3} />
            {t.locked && <span className="wa-lock">Premium</span>}
            <b>
              {t.title}
              <small>{minutes(t)}</small>
            </b>
          </Link>
        ))}
      </div>
    </section>
  );
}

/** A prayer's uploaded picture, or its drawn scene */
function Art({ track, seed }: { track: Track; seed: number }) {
  if (track.imageUrl) {
    return (
      <div className="art">
        {/* eslint-disable-next-line @next/next/no-img-element -- R2 images, sized by CSS */}
        <img src={track.imageUrl} alt="" />
      </div>
    );
  }
  return <Scene name={track.scene} seed={seed} noBigTrees />;
}
