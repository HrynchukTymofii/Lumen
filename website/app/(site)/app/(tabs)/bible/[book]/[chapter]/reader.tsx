"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { post } from "../../../../../_components/post";
import { createConversation } from "../../../companion/chat-api";
import { HIGHLIGHT_COLORS, LAST_READ_COOKIE, highlightVar, type Chapter, type HighlightColor, type Mark } from "../../shared";

// Highlights, notes and bookmarks go to the account through the same sync endpoint the app uses
// (lib/userLibrary.ts), so they show on the phone too.
function sync(op: Record<string, unknown>) {
  return post("/api/me/sync", { ops: [op] });
}

const NO_MARK: Mark = { highlight: false, color: null, note: "" };

export function ChapterReader({
  chapter,
  initialMarks,
  pointed,
  aiEnabled,
}: {
  chapter: Chapter;
  initialMarks: Record<number, Mark>;
  pointed: { from: number; to: number } | null;
  aiEnabled: boolean;
}) {
  const router = useRouter();
  const [marks, setMarks] = useState(initialMarks);
  const [selected, setSelected] = useState<number | null>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [copied, setCopied] = useState(false);
  const [asking, setAsking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Remember where reading stopped, for the Bible tab
  useEffect(() => {
    document.cookie = `${LAST_READ_COOKIE}=${chapter.book.osis}.${chapter.chapter}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
  }, [chapter.book.osis, chapter.chapter]);

  // Escape closes the sheet
  useEffect(() => {
    if (selected === null) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected]);

  const verse = chapter.verses.find((v) => v.v === selected);
  const mark = (selected !== null && marks[selected]) || NO_MARK;
  const ref = verse ? `${chapter.book.name} ${chapter.chapter}:${verse.v}` : "";
  const quoted = verse ? `“${verse.text.trim()}” ${ref} (${chapter.translation})` : "";

  function close() {
    setSelected(null);
    setEditing(false);
    setCopied(false);
    setError(null);
  }

  function pick(v: number) {
    if (selected === v) return close();
    setSelected(v);
    setEditing(false);
    setCopied(false);
    setError(null);
  }

  function update(change: Partial<Mark>) {
    if (!verse) return;
    const before = marks;
    const next = { ...mark, ...change };
    setMarks({ ...marks, [verse.v]: next });
    sync({
      type: "mark",
      osis: chapter.book.osis,
      chapter: chapter.chapter,
      v: verse.v,
      book: chapter.book.name,
      text: verse.text,
      translation: chapter.translation,
      highlight: next.highlight,
      color: next.color,
      note: next.note,
      updatedAt: Date.now(),
    }).catch((err) => {
      setMarks(before);
      setError(err instanceof Error ? err.message : "Couldn't save");
    });
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(quoted);
      setCopied(true);
    } catch {
      setError("Couldn't copy. Select the text and copy it instead.");
    }
  }

  async function share() {
    if (navigator.share) {
      navigator.share({ text: quoted }).catch(() => {});
    } else copy();
  }

  async function ask() {
    setAsking(true);
    try {
      const id = await createConversation();
      router.push(`/app/companion/${id}?prompt=${encodeURIComponent(`Help me understand ${ref}: ${quoted}`)}&send=1`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setAsking(false);
    }
  }

  return (
    <>
      <article className="bible-text">
        <h2>
          {chapter.book.name} {chapter.chapter}
        </h2>
        <span className="eyebrow" style={{ color: "var(--muted)" }}>
          {chapter.translation}
        </span>
        <p>
          {chapter.verses.map((v) => {
            const m = marks[v.v];
            const isPointed = pointed && v.v >= pointed.from && v.v <= pointed.to;
            const tint = m?.highlight ? highlightVar(m.color) : isPointed ? "var(--butter)" : undefined;
            return (
              <span
                key={v.v}
                role="button"
                tabIndex={0}
                className={`verse${selected === v.v ? " sel" : ""}${tint ? " tinted" : ""}`}
                style={tint ? { background: tint } : undefined}
                onClick={() => pick(v.v)}
                onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), pick(v.v))}
                aria-pressed={selected === v.v}
              >
                <sup>{v.v}</sup>
                {v.text}
                {m?.note ? <span className="note-dot" title="Has a note" aria-label="Has a note" /> : null}{" "}
              </span>
            );
          })}
        </p>
      </article>

      {verse && (
        <div className="verse-sheet" role="dialog" aria-label={ref}>
          <div className="vs-head">
            <span />
            <b>{ref}</b>
            <button type="button" className="round-btn sm" onClick={close} aria-label="Close">
              ✕
            </button>
          </div>

          {/* Highlight colors: click one to highlight, click it again to remove */}
          <div className="vs-colors">
            {HIGHLIGHT_COLORS.map((color: HighlightColor) => {
              const on = mark.highlight && (mark.color ?? "yellow") === color;
              return (
                <button
                  key={color}
                  type="button"
                  className={`vs-color${on ? " on" : ""}`}
                  style={{ background: highlightVar(color) }}
                  onClick={() => update(on ? { highlight: false } : { highlight: true, color })}
                  aria-label={on ? `Remove ${color} highlight` : `Highlight ${color}`}
                  aria-pressed={on}
                >
                  {on ? "✓" : ""}
                </button>
              );
            })}
          </div>

          {editing ? (
            <form
              className="vs-note"
              onSubmit={(e) => {
                e.preventDefault();
                update({ note: draft.trim() });
                setEditing(false);
              }}
            >
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value.slice(0, 5000))}
                placeholder="What is this verse saying to you?"
                rows={4}
                autoFocus
              />
              <div className="vs-note-actions">
                {mark.note && (
                  <button
                    type="button"
                    className="wa-danger"
                    onClick={() => {
                      update({ note: "" });
                      setEditing(false);
                    }}
                  >
                    Delete note
                  </button>
                )}
                <button type="button" className="btn-line" style={{ height: 44 }} onClick={() => setEditing(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-ink sm" style={{ paddingRight: 20 }}>
                  Save
                </button>
              </div>
            </form>
          ) : (
            mark.note && (
              <button type="button" className="vs-note-preview" onClick={() => (setDraft(mark.note), setEditing(true))}>
                {mark.note}
              </button>
            )
          )}

          {!editing && (
            <div className="vs-actions">
              <SheetAction label={mark.note ? "Edit note" : "Note"} onClick={() => (setDraft(mark.note), setEditing(true))}>
                <path d="M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4" />
              </SheetAction>
              <SheetAction label={copied ? "Copied" : "Copy"} onClick={copy}>
                {copied ? <path d="M5 12.5l4.5 4.5L19 7.5" /> : <><rect x="9" y="9" width="11" height="11" rx="2" /><path d="M5 15V5a1 1 0 011-1h10" /></>}
              </SheetAction>
              <SheetAction label="Share" onClick={share}>
                <path d="M12 3v12M7 8l5-5 5 5M5 14v5a2 2 0 002 2h10a2 2 0 002-2v-5" />
              </SheetAction>
              {aiEnabled && (
                <SheetAction label={asking ? "Opening…" : "Ask"} onClick={ask}>
                  <path d="M21 12a8 8 0 01-11.6 7.1L4 20l1-4.6A8 8 0 1121 12z" />
                </SheetAction>
              )}
            </div>
          )}
          {error && <p className="fn-error">{error}</p>}
        </div>
      )}
    </>
  );
}

function SheetAction({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" className="vs-action" onClick={onClick}>
      <span>
        <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          {children}
        </svg>
      </span>
      {label}
    </button>
  );
}

export function BookmarkButton({ osis, book, chapter, initial }: { osis: string; book: string; chapter: number; initial: boolean }) {
  const [on, setOn] = useState(initial);
  const toggle = () => {
    const next = !on;
    setOn(next);
    sync({ type: "bookmark", osis, chapter, book, on: next, at: Date.now() }).catch(() => setOn(!next));
  };
  return (
    <button type="button" className={`bookmark${on ? " on" : ""}`} onClick={toggle} aria-pressed={on} aria-label={on ? "Remove bookmark" : "Bookmark this chapter"}>
      <svg width={24} height={24} viewBox="0 0 24 24" fill={on ? "currentColor" : "none"} stroke="currentColor" strokeWidth={2} strokeLinejoin="round" aria-hidden>
        <path d="M6 3h12v18l-6-4.5L6 21z" />
      </svg>
    </button>
  );
}
