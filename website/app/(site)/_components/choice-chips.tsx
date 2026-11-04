"use client";

import { useState } from "react";

// A row of chips where one is picked (the landing's "your tradition, your Bible" demo; nothing is saved).
export function ChoiceChips({ options, initial, label }: { options: readonly string[]; initial: string; label: string }) {
  const [picked, setPicked] = useState(initial);
  return (
    <div className="chips" role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button key={o} type="button" role="radio" aria-checked={picked === o} className="chip" onClick={() => setPicked(o)}>
          {o}
        </button>
      ))}
    </div>
  );
}
