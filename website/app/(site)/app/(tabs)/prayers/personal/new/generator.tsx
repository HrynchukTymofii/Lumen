"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Light } from "@/components/kit";
import { generatePrayer, PrayerError, type CrisisResource } from "../prayers-api";

// The prayer generator (as app/app/personal-prayer/new.tsx). Free: 5 a month. Premium: 10 a day.

const MAX = 600;

const STARTERS = [
  { label: "Anxiety", text: "I can't stop worrying about " },
  { label: "Grief", text: "I'm grieving " },
  { label: "Family", text: "I'm struggling with my family because " },
  { label: "Work", text: "Work has been hard lately: " },
  { label: "Health", text: "I'm worried about my health (or someone's): " },
  { label: "Gratitude", text: "I want to thank God for " },
];

const LENGTHS = [
  { key: "short", label: "Short", note: "about 1 min" },
  { key: "medium", label: "Medium", note: "about 2–3 min" },
  { key: "long", label: "Long", note: "about 5 min" },
] as const;

export function Generator({ premium, left: initialLeft, limit, per }: { premium: boolean; left: number; limit: number; per: "month" | "day" }) {
  const router = useRouter();
  const [need, setNeed] = useState("");
  const [length, setLength] = useState<(typeof LENGTHS)[number]["key"]>("short");
  const [left, setLeft] = useState(initialLeft);
  const [writing, setWriting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [crisis, setCrisis] = useState<CrisisResource[] | null>(null);

  async function write(e: React.FormEvent) {
    e.preventDefault();
    setWriting(true);
    setError(null);
    setCrisis(null);
    try {
      const result = await generatePrayer(need.trim(), length);
      if ("crisis" in result) {
        setCrisis(result.resources);
        setWriting(false);
        return;
      }
      router.push(`/app/prayers/personal/${result.id}`);
    } catch (err) {
      const e = err instanceof PrayerError ? err : new PrayerError("Something went wrong. Please try again.", 0);
      if (e.code === "limit") setLeft(0);
      setError(e.message);
      setWriting(false);
    }
  }

  if (writing) {
    return (
      <div className="wa-card wa-empty wa-sec">
        <Light size={96} state="thinking" />
        <h2 className="pp-title" style={{ marginTop: 16 }}>
          Writing your prayer…
        </h2>
        <p className="wa-lead">Choosing words and verses for what you’re carrying.</p>
      </div>
    );
  }

  return (
    <form onSubmit={write}>
      <h1 className="wa-h1">What’s on your heart?</h1>
      <p className="wa-lead">Tell us what you’re going through, in your own words. We’ll write a prayer for it and keep it in My prayers.</p>

      <div className="wa-chips">
        {STARTERS.map((s) => (
          <button key={s.label} type="button" className="wa-chip" onClick={() => setNeed((n) => (n.trim() ? n : s.text))}>
            {s.label}
          </button>
        ))}
      </div>

      <textarea
        className="pp-textarea"
        value={need}
        onChange={(e) => setNeed(e.target.value.slice(0, MAX))}
        placeholder="For example: my mother is in the hospital and I’m scared…"
        rows={6}
        aria-label="What's on your heart"
      />
      <p className="pp-meta" style={{ textAlign: "right" }}>
        {need.length}/{MAX}
      </p>

      <p className="pp-label">Length</p>
      <div className="pp-lengths" role="radiogroup" aria-label="Length">
        {LENGTHS.map((l) => (
          <button key={l.key} type="button" role="radio" aria-checked={l.key === length} className={l.key === length ? "on" : ""} onClick={() => setLength(l.key)}>
            <b>{l.label}</b>
            <small>{l.note}</small>
          </button>
        ))}
      </div>

      {crisis && (
        <div style={{ marginTop: 18, display: "grid", gap: 10 }}>
          <p>It sounds like you’re carrying something very heavy right now. Please reach out to someone who can be with you.</p>
          <div className="crisis">
            <b>You don’t have to go through this alone</b>
            {crisis.map((r) => (
              <a key={r.href} href={r.href} className="crisis-btn">
                {r.label}
                <small>{r.note}</small>
              </a>
            ))}
          </div>
        </div>
      )}
      {error && <p className="pp-error">{error}</p>}

      <div className="pp-actions">
        {left === 0 && !premium ? (
          <Link href="/app/upgrade" className="btn-ink full">
            Get Premium for more prayers
          </Link>
        ) : (
          <button type="submit" className="btn-ink full" disabled={need.trim().length < 10 || left === 0}>
            Write my prayer
          </button>
        )}
        <p className="pp-meta" style={{ textAlign: "center" }}>
          {left === 0
            ? premium
              ? `You’ve written ${limit} prayers today. More tomorrow.`
              : `You’ve used this month’s ${limit} prayers.`
            : `${left} of ${limit} left ${per === "day" ? "today" : "this month"}`}
        </p>
      </div>
    </form>
  );
}
