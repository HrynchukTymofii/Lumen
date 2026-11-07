// A recorded prayer as short phrases with start times, for text that follows the audio. Same rules as the app's
// player (app/app/player/[slug].tsx), so a prayer moves along the same way on the web and on the phone.

export type Line = { t: number | null; text: string; p?: boolean };
export type Phrase = { text: string; start: number; paragraph: boolean };

// A phrase longer than this is broken at its commas, so the highlight moves along in small, easy steps
const LONG = 80;
const TARGET = 60;

// Splits a line into sentences, and long sentences at commas and dashes. Very short pieces ("Amen.", "Lord,") join
// the next one.
function sentences(text: string) {
  const parts = text.match(/[^.!?…;:]+[.!?…;:]+["”’)]*\s*|[^.!?…;:]+$/g)?.map((p) => p.trim()).filter(Boolean) ?? [text];
  const pieces = parts.flatMap((p) => {
    if (p.length <= LONG) return [p];
    const out: string[] = [];
    for (const c of p.split(/(?<=[,–—])\s+/)) {
      if (out.length && out[out.length - 1].length + c.length < TARGET) out[out.length - 1] += ` ${c}`;
      else out.push(c);
    }
    return out;
  });
  const out: string[] = [];
  for (const p of pieces) {
    if (out.length && out[out.length - 1].length < 24) out[out.length - 1] += ` ${p}`;
    else out.push(p);
  }
  return out;
}

// When each phrase starts. Lines with timestamps keep them, and their sentences share the line's time by length.
// Without timestamps the time is shared across the whole prayer by length, which follows a steady reading voice.
export function phrases(source: Line[], duration: number): Phrase[] {
  const marked = source.some((l) => l.p);
  const lines = source.flatMap((l, n) =>
    l.text
      .split(/\n+/)
      .map((t) => t.trim())
      .filter(Boolean)
      .map((text, i) => ({ text, t: i === 0 ? l.t : null, para: i > 0 || n === 0 || !marked || Boolean(l.p) })),
  );
  const out: Phrase[] = [];
  if (lines.length > 0 && lines.every((l) => l.t !== null)) {
    lines.forEach((l, i) => {
      const from = l.t!;
      const to = i + 1 < lines.length ? lines[i + 1].t! : Math.max(duration, from);
      const parts = sentences(l.text);
      const total = parts.reduce((n, p) => n + p.length, 0) || 1;
      let at = from;
      parts.forEach((p, j) => {
        out.push({ text: p, start: at, paragraph: j === 0 && l.para });
        at += ((to - from) * p.length) / total;
      });
    });
    return out;
  }
  const parts = lines.flatMap((l) => sentences(l.text).map((p, j) => ({ text: p, paragraph: j === 0 && l.para })));
  const total = parts.reduce((n, p) => n + p.text.length, 0) || 1;
  let at = 0;
  for (const p of parts) {
    out.push({ ...p, start: at });
    at += (duration * p.text.length) / total;
  }
  return out;
}

export function clock(seconds: number) {
  const s = Math.max(0, Math.floor(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}
