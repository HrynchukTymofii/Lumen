"use client";

import { useEffect, useRef, useState } from "react";
import { Light } from "@/components/kit";
import { VerseChip, type Verse } from "./verse-chip";

export type Talk = { me: string; reply: string; verses: Verse[] };

// The landing's "Grounded in Scripture" chat: a new worry every few seconds, the companion "writes", then answers
// with real verses. `scenes` are server-rendered backgrounds, one per talk, crossfaded behind the chat.
// Stops on hover or keyboard focus so a verse can be read; with reduced motion it skips the typing step.
const T_TYPING = 1100;
const T_REPLY = 2600;
const T_NEXT = 9500;

type Phase = "me" | "typing" | "reply";

export function ChatDemo({ talks, scenes, name }: { talks: Talk[]; scenes: React.ReactNode[]; name: string }) {
  const [i, setI] = useState(0);
  const [phase, setPhase] = useState<Phase>("reply"); // first paint shows a whole talk (no-JS and server render)
  const [paused, setPaused] = useState(false);
  const started = useRef(false);

  // Each new talk: the worry, then the Light "writing", then its answer
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const timers: number[] = [];
    if (started.current && !reduced) {
      setPhase("me");
      timers.push(window.setTimeout(() => setPhase("typing"), T_TYPING));
      timers.push(window.setTimeout(() => setPhase("reply"), T_REPLY));
    } else {
      setPhase("reply");
    }
    started.current = true;
    return () => timers.forEach(clearTimeout);
  }, [i]);

  // Move on to the next talk, unless the visitor is reading this one
  useEffect(() => {
    if (paused) return;
    const t = window.setTimeout(() => setI((n) => (n + 1) % talks.length), T_NEXT);
    return () => clearTimeout(t);
  }, [i, paused, talks.length]);

  const t = talks[i];
  return (
    <div
      className="photo-card"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      {scenes.map((s, n) => (
        <div key={n} className={`bg-scene${n === i ? " on" : ""}`} aria-hidden>
          {s}
        </div>
      ))}
      <div className="chat" aria-live="polite" key={i}>
        <div className="bub me">{t.me}</div>
        {phase === "typing" && (
          <div className="bub ai typing" aria-label={`${name} is writing`}>
            <i />
            <i />
            <i />
          </div>
        )}
        {phase === "reply" && (
          <div className="bub ai">
            <span className="who">
              <Light size={34} state="speaking" label="" />
              {name}
            </span>
            {t.reply}
            <span className="refs">
              {t.verses.map((v) => (
                <VerseChip key={v.ref} verse={v} />
              ))}
            </span>
          </div>
        )}
      </div>
      <div className="pager" role="tablist" aria-label="Example conversations">
        {talks.map((x, n) => (
          <button
            key={n}
            type="button"
            role="tab"
            aria-selected={n === i}
            aria-label={x.me}
            onClick={() => setI(n)}
          />
        ))}
      </div>
    </div>
  );
}
