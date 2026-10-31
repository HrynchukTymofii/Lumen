// The companion cites passages with inline markers like [[P2]] (SPEC §7.2, marker approach). While the answer
// streams, markers are removed from the text the user sees and their labels collected. A marker can be split
// across chunks ("…over. [[P" + "2]]"), so a tail that could still become one is held back until it can't.

const MARKER = /\s?\[\[P(\d{1,2})\]\]/g;
// Trailing spaces are held too: they may turn out to sit in front of a marker
const PARTIAL = /\s*(?:\[(?:\[(?:P\d{0,2}\]?)?)?)?$/;

export class MarkerStripper {
  private pending = "";
  readonly cited: number[] = [];

  /** Text that is safe to show now. */
  push(chunk: string) {
    this.pending += chunk;
    let text = this.pending.replace(MARKER, (_, n: string) => {
      const id = Number(n);
      if (!this.cited.includes(id)) this.cited.push(id);
      return "";
    });
    const tail = PARTIAL.exec(text);
    this.pending = tail && tail[0] ? tail[0] : "";
    if (this.pending) text = text.slice(0, tail!.index);
    return text;
  }

  /** Whatever is left at the end (a "[" that never became a marker is real text). */
  flush() {
    const rest = this.pending;
    this.pending = "";
    return rest;
  }
}
