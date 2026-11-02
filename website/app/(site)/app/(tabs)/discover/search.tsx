"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { createConversation } from "../companion/chat-api";
import { categoryTitle } from "../prayers/categories";

// Search, as in the app (app/app/search.tsx): prayers (title, subtitle, tags, category), Bible books ("john 3"
// opens John 3), and "Ask the companion" with whatever was typed. Empty, it suggests popular searches.

const POPULAR = ["Morning", "Peace", "Sleep", "Psalms", "Grief", "Family", "Anxiety", "Gratitude"];

type Track = { slug: string; title: string; subtitle: string | null; category: string; tags: string[]; locked: boolean };
type Book = { osis: string; name: string; chapters: number };

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();

export function Search({ tracks, books, aiEnabled }: { tracks: Track[]; books: Book[]; aiEnabled: boolean }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [focused, setFocused] = useState(false);
  const [asking, setAsking] = useState(false);
  const query = norm(q);

  const prayers = useMemo(
    () =>
      query
        ? tracks.filter((t) => [t.title, t.subtitle ?? "", t.category, categoryTitle(t.category), ...t.tags].some((s) => norm(s).includes(query))).slice(0, 8)
        : [],
    [query, tracks],
  );

  // "john 3", "1 cor 13", "psalm 23": a book name (or its start) and an optional chapter
  const bookHits = useMemo(() => {
    if (!query) return [];
    const m = /^(.*?)\s*(\d+)?$/.exec(query);
    const name = (m?.[1] ?? query).replace(/\s+/g, " ");
    const chapter = m?.[2] ? Number(m[2]) : null;
    if (!name) return [];
    return books
      .filter((b) => norm(b.name).startsWith(name) || norm(b.name).replace(/s$/, "").startsWith(name.replace(/s$/, "")))
      .slice(0, 4)
      .map((b) => ({ ...b, chapter: chapter && chapter <= b.chapters ? chapter : 1 }));
  }, [query, books]);

  async function ask() {
    setAsking(true);
    try {
      const id = await createConversation();
      router.push(`/app/companion/${id}?prompt=${encodeURIComponent(q.trim())}&send=1`);
    } catch {
      setAsking(false);
    }
  }

  return (
    <div className="search">
      <label className="search-box">
        <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden>
          <circle cx="11" cy="11" r="7" />
          <path d="M20 20l-3.5-3.5" />
        </svg>
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 150)}
          placeholder="Prayers, topics, Bible books…"
          aria-label="Search"
        />
      </label>

      {!query && focused && (
        <div className="wa-chips">
          {POPULAR.map((p) => (
            <button key={p} type="button" className="wa-chip" onMouseDown={(e) => e.preventDefault()} onClick={() => setQ(p)}>
              {p}
            </button>
          ))}
        </div>
      )}

      {query && (
        <div className="wa-card wa-list search-results">
          {bookHits.map((b) => (
            <Link key={b.osis} href={`/app/bible/${b.osis}/${b.chapter}`} className="wa-list-row">
              <span>
                <b>
                  {b.name} {b.chapter}
                </b>
                <small>Bible</small>
              </span>
            </Link>
          ))}
          {prayers.map((t) => (
            <Link key={t.slug} href={`/app/prayers/${t.slug}`} className="wa-list-row">
              <span>
                <b>{t.title}</b>
                <small>{categoryTitle(t.category)}</small>
              </span>
              {t.locked && <span className="wa-lock static">Premium</span>}
            </Link>
          ))}
          {aiEnabled && (
            <button type="button" className="wa-list-row ask" onClick={ask} disabled={asking}>
              <span>
                <b>{asking ? "Opening…" : `Ask the companion: “${q.trim()}”`}</b>
                <small>Answers quote real verses</small>
              </span>
            </button>
          )}
          {!aiEnabled && !prayers.length && !bookHits.length && <p className="wa-lead" style={{ padding: "6px 0" }}>Nothing found.</p>}
        </div>
      )}
    </div>
  );
}
