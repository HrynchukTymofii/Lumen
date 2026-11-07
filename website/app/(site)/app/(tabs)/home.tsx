"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createConversation } from "./companion/chat-api";

// The interactive bits of Today (page.tsx).

/**
 * "Talk it through": one sentence for what they're carrying, a box to start typing and the companion's suggestions
 * (funnels/companion-topics.ts). Sending opens a new conversation with the text in its input box.
 */
export function TalkCard({ line, prompts }: { line: [string, string]; prompts: string[] }) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function start(prompt: string, send: boolean) {
    setBusy(true);
    setError(null);
    try {
      const id = await createConversation();
      const q = new URLSearchParams({ prompt });
      if (send) q.set("send", "1");
      router.push(`/app/companion/${id}${prompt ? `?${q}` : ""}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setBusy(false);
    }
  }

  return (
    <div className="home-box home-talk">
      <div className="home-talk-head">
        <span className="glow" aria-hidden />
        <h2>Talk it through</h2>
      </div>
      <p className="home-talk-line">
        {line[0]} <span>{line[1]}</span>
      </p>
      <form
        className="home-ask"
        onSubmit={(e) => {
          e.preventDefault();
          if (text.trim()) start(text.trim(), true);
        }}
      >
        <input id="home-ask" value={text} onChange={(e) => setText(e.target.value)} placeholder="What’s on your heart?" aria-label="Message the companion" disabled={busy} />
        <button type="submit" aria-label="Send" disabled={busy || !text.trim()}>
          <svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinejoin="round" aria-hidden>
            <path d="M21 3L3 10.5l7.5 3L14 21z" />
          </svg>
        </button>
      </form>
      <div className="home-sugg">
        {prompts.map((p) => (
          // A finished suggestion is sent straight away; one ending in "…" is put in the box to finish
          <button key={p} type="button" onClick={() => start(p, !p.endsWith("…"))} disabled={busy}>
            {p}
          </button>
        ))}
      </div>
      {error && <p className="fn-error">{error}</p>}
    </div>
  );
}

/** "Mark as prayed": counts today in the prayer week (POST /api/today/prayed), then refreshes the page */
export function MarkPrayed({ prayed }: { prayed: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (prayed) {
    return (
      <span className="home-prayed">
        <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M5 12.5l4.5 4.5L19 7.5" />
        </svg>
        Prayed today
      </span>
    );
  }
  return (
    <>
      <button
        type="button"
        className="btn-ink sm home-mark"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setError(null);
          const res = await fetch("/api/today/prayed", { method: "POST", headers: { "content-type": "application/json" }, body: "{}" }).catch(() => null);
          if (res?.ok) router.refresh();
          else {
            setError("Couldn’t save that. Check your connection and try again.");
            setBusy(false);
          }
        }}
      >
        {busy ? "Saving…" : "Mark as prayed"}
      </button>
      {error && <p className="fn-error">{error}</p>}
    </>
  );
}
