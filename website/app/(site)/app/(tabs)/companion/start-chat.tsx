"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createConversation } from "./chat-api";

const QUICK_PROMPTS = ["Pray for me", "Explain this verse", "I'm struggling with…", "Give me a verse for…", "Help me forgive"];

/** "New conversation" and the quick prompts; a prompt is put in the chat's input box, ready to finish or send. */
export function StartChat() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function start(prompt?: string) {
    setBusy(true);
    setError(null);
    try {
      const id = await createConversation();
      router.push(`/app/companion/${id}${prompt ? `?prompt=${encodeURIComponent(prompt)}` : ""}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setBusy(false);
    }
  }

  return (
    <div style={{ marginTop: 20 }}>
      <button type="button" className="btn-ink full" onClick={() => start()} disabled={busy}>
        {busy ? "One moment…" : "New conversation"}
        <span className="dot" aria-hidden>
          +
        </span>
      </button>
      <div className="wa-chips">
        {QUICK_PROMPTS.map((p) => (
          <button key={p} type="button" className="wa-chip" onClick={() => start(p)} disabled={busy}>
            {p}
          </button>
        ))}
      </div>
      {error && <p className="fn-error">{error}</p>}
    </div>
  );
}
