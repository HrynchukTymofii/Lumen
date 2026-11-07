"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { BookIcon } from "@/components/kit";
import { SITE } from "@/lib/site";
import { StoreButtons } from "../../../../../_components/store-buttons";
import {
  MAX_AUDIO_WORDS,
  PrayerError,
  countWords,
  deletePrayer,
  editPrayer,
  paragraphsOf,
  recordPrayer,
  tokensFor,
  type PersonalPrayer,
} from "../prayers-api";

// One personal prayer (as app/app/personal-prayer/[id].tsx): read, edit, copy, listen. Listening records it the
// first time (1 token per 200 words; Premium's first short one each month is free). Tokens are bought in the app.

export function PrayerView({ initial, premium, tokens: initialTokens }: { initial: PersonalPrayer; premium: boolean; tokens: number }) {
  const router = useRouter();
  const [prayer, setPrayer] = useState(initial);
  const [tokens, setTokens] = useState(initialTokens);
  const [editing, setEditing] = useState<{ title: string; text: string } | null>(null);
  const [busy, setBusy] = useState<"save" | "record" | "delete" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [needTokens, setNeedTokens] = useState(false);
  const [copied, setCopied] = useState(false);
  const [current, setCurrent] = useState(-1);

  const paragraphs = useMemo(() => paragraphsOf(prayer.text), [prayer.text]);
  const audio = prayer.audio;
  const price = prayer.audioPrice;

  async function save() {
    if (!editing) return;
    setBusy("save");
    setError(null);
    try {
      setPrayer(await editPrayer(prayer.id, { title: editing.title.trim() || prayer.title, text: editing.text }));
      setEditing(null);
    } catch (err) {
      setError(err instanceof PrayerError ? err.message : "Something went wrong. Please try again.");
    } finally {
      setBusy(null);
    }
  }

  async function record() {
    setNeedTokens(false);
    if (!price.free && tokens < price.tokens) {
      if (!premium && tokens === 0) return router.push("/app/upgrade");
      return setNeedTokens(true);
    }
    if (price.tokens >= 3 && !window.confirm(`This prayer is ${prayer.words} words, so it uses ${price.tokens} tokens. You have ${tokens}. Record it?`)) return;
    setBusy("record");
    setError(null);
    try {
      const updated = await recordPrayer(prayer.id, price.free ? 0 : price.tokens);
      setPrayer(updated);
      if (!price.free) setTokens((t) => t - price.tokens);
    } catch (err) {
      if (err instanceof PrayerError && err.code === "price_changed" && err.data?.audioPrice) {
        setPrayer({ ...prayer, audioPrice: err.data.audioPrice as PersonalPrayer["audioPrice"] });
        setError(err.message);
      } else if (err instanceof PrayerError && err.code === "no_tokens") setNeedTokens(true);
      else if (err instanceof PrayerError && err.code === "paywall") router.push("/app/upgrade");
      else setError(err instanceof PrayerError ? err.message : "Something went wrong. Please try again.");
    } finally {
      setBusy(null);
    }
  }

  async function remove() {
    if (!window.confirm("Delete this prayer? It will be removed from My prayers on all your devices, with its audio.")) return;
    setBusy("delete");
    try {
      await deletePrayer(prayer.id);
      router.push("/app/prayers/personal");
      router.refresh();
    } catch (err) {
      setError(err instanceof PrayerError ? err.message : "Something went wrong. Please try again.");
      setBusy(null);
    }
  }

  async function copy() {
    await navigator.clipboard.writeText(`${prayer.title}\n\n${prayer.text}`).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  // Which paragraph the voice is on, from the recording's line timings (none after an edit: the text differs)
  function onTime(t: number) {
    if (!audio || audio.stale) return;
    let i = -1;
    audio.lines.forEach((l, n) => {
      if (l.t !== null && l.t <= t + 0.2) i = n;
    });
    setCurrent(i);
  }

  if (editing) {
    const words = countWords(editing.text);
    return (
      <div className="wa-sec">
        <input className="pp-title-input" value={editing.title} maxLength={80} onChange={(e) => setEditing({ ...editing, title: e.target.value })} aria-label="Title" />
        <textarea className="pp-textarea pp-read" value={editing.text} onChange={(e) => setEditing({ ...editing, text: e.target.value })} rows={16} aria-label="Prayer" />
        <p className="pp-meta">
          {words} words · {words > MAX_AUDIO_WORDS ? `audio is up to ${MAX_AUDIO_WORDS.toLocaleString()} words` : `audio: ${tokensFor(words)} ${tokensFor(words) === 1 ? "token" : "tokens"}`}
        </p>
        {error && <p className="pp-error">{error}</p>}
        <div className="pp-row">
          <button className="btn-ink sm" onClick={save} disabled={busy === "save" || !editing.text.trim()}>
            {busy === "save" ? "Saving…" : "Save"}
          </button>
          <button className="btn-line" style={{ height: 44 }} onClick={() => setEditing(null)}>
            Cancel
          </button>
        </div>
      </div>
    );
  }

  const label = price.free ? "Listen · free this month" : `${audio?.stale ? "Record the new version" : "Listen"} · ${price.tokens} ${price.tokens === 1 ? "token" : "tokens"}`;

  return (
    <article className="wa-sec">
      <p className="eyebrow">{prayer.source === "companion" ? "From the companion" : prayer.source === "manual" ? "Your prayer" : "Written for you"}</p>
      <h1 className="wa-h1">{prayer.title}</h1>

      {audio && (
        <audio
          key={audio.url.split("?")[0]}
          src={audio.url}
          controls
          preload="metadata"
          onTimeUpdate={(e) => onTime(e.currentTarget.currentTime)}
          onEnded={() => setCurrent(-1)}
        />
      )}

      <div className="pp-text">
        {paragraphs.map((p, i) => (
          <p key={i} className={current !== -1 && current !== i ? "dim" : ""}>
            {p}
          </p>
        ))}
      </div>

      {prayer.refs.map((v) => (
        <div key={v.ref} className="cite" style={{ marginTop: 10 }}>
          <b>
            <BookIcon size={15} />
            {v.ref}
          </b>
          <p>{v.text}</p>
        </div>
      ))}

      <div className="wa-chips">
        <button className="wa-chip" onClick={() => setEditing({ title: prayer.title, text: prayer.text })}>
          Edit
        </button>
        <button className="wa-chip" onClick={copy}>
          {copied ? "Copied" : "Copy"}
        </button>
        <button className="wa-chip" onClick={remove} disabled={busy === "delete"}>
          Delete
        </button>
      </div>

      {(!audio || audio.stale) && (
        <div className="pp-actions">
          {price.tooLong ? (
            <p className="pp-meta">
              Audio prayers can be up to {MAX_AUDIO_WORDS.toLocaleString()} words. This one has {prayer.words}. Shorten it to listen.
            </p>
          ) : (
            <>
              <button className="btn-ink full" onClick={record} disabled={busy === "record"}>
                {busy === "record" ? "Recording… this can take up to half a minute" : label}
              </button>
              <p className="pp-meta" style={{ textAlign: "center" }}>
                {audio?.stale
                  ? "You edited this prayer after it was recorded. The old recording still plays above."
                  : premium || tokens > 0
                    ? `${prayer.words} words · 1 token per 200 words · you have ${tokens}`
                    : "Hear it read aloud with Premium."}
              </p>
            </>
          )}
          {needTokens && (
            <div className="wa-card pp-buy">
              <b>
                This prayer needs {price.tokens} {price.tokens === 1 ? "token" : "tokens"}. You have {tokens}.
              </b>
              <p>Prayer tokens are sold in the {SITE.name} app: 5 for $2.99 or 15 for $7.99. They show up here right after you buy them.</p>
              <StoreButtons placement="prayer_tokens" />
              <button className="wa-danger" onClick={() => router.refresh()}>
                I bought tokens, refresh
              </button>
            </div>
          )}
          {error && <p className="pp-error">{error}</p>}
        </div>
      )}
      {!premium && tokens === 0 && (!audio || audio.stale) && !price.tooLong && (
        <p className="pp-meta" style={{ textAlign: "center" }}>
          <Link href="/app/upgrade">See Premium</Link>
        </p>
      )}
    </article>
  );
}
