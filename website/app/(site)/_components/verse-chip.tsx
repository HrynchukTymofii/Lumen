"use client";

import { useState } from "react";
import { BookIcon } from "@/components/kit";

export type Verse = { ref: string; verses: [number, string][] };

// A verse reference that opens the real Bible text in place (on the landing chat demo).
export function VerseChip({ verse }: { verse: Verse }) {
  const [open, setOpen] = useState(false);
  return (
    <span>
      <button type="button" className="vchip" aria-expanded={open} onClick={() => setOpen(!open)}>
        <BookIcon />
        {verse.ref}
      </button>
      {open && (
        <span className="verse-pop" style={{ display: "block" }}>
          {verse.verses.map(([n, t]) => (
            <span key={n}>
              <sup>{n}</sup>
              {t}{" "}
            </span>
          ))}
          <small>{verse.ref} · World English Bible</small>
        </span>
      )}
    </span>
  );
}
