// The companion cites passages with inline markers like [[P2]] (SPEC §7.2, marker approach), and wraps a prayer it
// writes in [[PRAYER:Short title]] … [[/PRAYER]] so the app can offer "Save to My prayers". While the answer
// streams, markers are removed from the text the user sees; cited labels and the prayer's place in the text are
// collected. A marker can be split across chunks ("…over. [[P" + "2]]"), so a tail that could still become one is
// held back until it can't.

const MARKER = /\s?\[\[P(\d{1,2})\]\]|\[\[PRAYER(?::([^\]\n]{0,80}))?\]\][ \t]*\n?|\n?[ \t]*\[\[\/PRAYER\]\]/g;
// "[", "[[", "[[P2]", "[[PRAYER:Title" … at the very end; trailing spaces are held too (they may sit before a marker)
const PARTIAL = /\s*(?:\[(?:\[[^\]\n]{0,90}\]?)?)?$/;

export type PrayerSpan = { title: string | null; start: number; end: number | null };

export class MarkerStripper {
  private pending = "";
  private emitted = 0; // characters of visible text handed out so far
  readonly cited: number[] = [];
  /** Where the prayer sits in the visible text (the first one, if the model wrote several). */
  prayer: PrayerSpan | null = null;

  /** Text that is safe to show now. */
  push(chunk: string) {
    const src = this.pending + chunk;
    let out = "";
    let last = 0;
    for (const m of src.matchAll(MARKER)) {
      out += src.slice(last, m.index);
      last = m.index + m[0].length;
      const at = this.emitted + out.length;
      if (m[1] !== undefined) {
        const id = Number(m[1]);
        if (!this.cited.includes(id)) this.cited.push(id);
      } else if (m[0].includes("[[PRAYER")) {
        if (!this.prayer) this.prayer = { title: m[2]?.trim() || null, start: at, end: null };
      } else if (this.prayer && this.prayer.end === null) {
        this.prayer.end = at;
      }
    }
    let rest = src.slice(last);
    const tail = PARTIAL.exec(rest);
    this.pending = tail && tail[0] ? tail[0] : "";
    if (this.pending) rest = rest.slice(0, tail!.index);
    out += rest;
    this.emitted += out.length;
    return out;
  }

  /** Whatever is left at the end (a "[" that never became a marker is real text). */
  flush() {
    const rest = this.pending;
    this.pending = "";
    this.emitted += rest.length;
    return rest;
  }

  /** The prayer's title and text, cut from the full visible answer. */
  prayerIn(shown: string) {
    if (!this.prayer) return null;
    const text = shown.slice(this.prayer.start, this.prayer.end ?? shown.length).trim();
    if (text.length < 20) return null;
    return { title: this.prayer.title ?? "A prayer", text };
  }
}
