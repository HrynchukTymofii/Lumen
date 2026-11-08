"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { BookIcon, Light } from "@/components/kit";
import type { LightState } from "@/lib/kit/art";
import { savePrayerFromMessage } from "../../prayers/personal/prayers-api";
import { ChatError, sendMessage, type ChatMessage, type CrisisResource } from "../chat-api";

// Chat, as in the app (app/app/companion/[id].tsx): the reply streams in as it's written; verses it cites show
// under it as cards. Crisis replies carry call / text buttons. Errors before the stream (weekly limit, too fast)
// show above the input. Until the first words arrive, the reply shows what the companion is doing.

const MAX_LENGTH = 1000;

function statusLine(s: { step: string; refs?: string[] }) {
  if (s.step === "searching") return "Searching the Scriptures";
  if (s.step === "reading") return s.refs?.length ? `Reading ${s.refs.join(", ")}` : "Reading the passages";
  return "Writing a reply";
}

export function Chat({
  id,
  title: initialTitle,
  initial,
  prompt,
  autoSend,
  aiEnabled,
}: {
  id: string;
  title: string | null;
  initial: ChatMessage[];
  prompt: string;
  autoSend: boolean;
  aiEnabled: boolean;
}) {
  const [title, setTitle] = useState(initialTitle);
  const [messages, setMessages] = useState(initial);
  const [input, setInput] = useState(prompt);
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState<string | null>(aiEnabled ? null : "The companion is turned off in Settings.");
  const [quotaHit, setQuotaHit] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const abort = useRef<AbortController | null>(null);
  const end = useRef<HTMLDivElement>(null);
  const box = useRef<HTMLTextAreaElement>(null);

  // Keep the newest words in view
  useEffect(() => {
    end.current?.scrollIntoView({ block: "end", behavior: "smooth" });
  }, [messages, status, quotaHit]);

  // Leaving the page stops a reply that is still streaming
  useEffect(() => () => abort.current?.abort(), []);

  // The box grows with the text, up to a few lines
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight + 3, 160)}px`;
    el.style.overflowY = el.scrollHeight > 160 ? "auto" : "hidden";
  }, [input]);

  const updateReply = (change: (m: ChatMessage) => ChatMessage) =>
    setMessages((list) => [...list.slice(0, -1), change(list[list.length - 1])]);

  async function send(textArg?: string) {
    const text = (textArg ?? input).trim();
    if (!text || sending) return;
    setInput("");
    // A quick prompt or handed-over question rode in on the URL; once sent, a reload shouldn't bring it back
    if (window.location.search) window.history.replaceState(null, "", `/app/companion/${id}`);
    setNotice(null);
    setQuotaHit(false);
    setSending(true);
    setStatus("Reading your message");
    if (!title) setTitle(text.slice(0, 60));

    const now = new Date().toISOString();
    setMessages((list) => [
      ...list,
      { id: `local-${now}`, role: "user", text, category: null, createdAt: now, citations: [] },
      { id: `reply-${now}`, role: "assistant", text: "", category: null, createdAt: now, citations: [] },
    ]);

    const controller = new AbortController();
    abort.current = controller;
    let got = false;
    try {
      await sendMessage(
        id,
        text,
        (e) => {
          if (e.event === "meta" && e.data.category === "on_topic") setStatus("Thinking about what you shared");
          else if (e.event === "status") setStatus(statusLine(e.data));
          else if (e.event === "delta") {
            got = true;
            updateReply((m) => ({ ...m, text: m.text + e.data.text }));
          } else if (e.event === "done") updateReply((m) => ({ ...m, id: e.data.messageId, citations: e.data.citations, prayer: e.data.prayer ? { title: e.data.prayer.title, savedId: null } : null }));
          else if (e.event === "blocked") {
            got = true;
            updateReply((m) => ({ ...m, id: e.data.messageId, text: e.data.text, category: e.data.category, resources: e.data.resources }));
          } else if (e.event === "error") {
            got = true;
            updateReply((m) => ({ ...m, text: m.text || e.data.message }));
          }
        },
        controller.signal,
      );
      if (!got && !controller.signal.aborted) throw new ChatError("The reply didn’t come through. Please try again.", 0);
    } catch (err) {
      if (controller.signal.aborted) return;
      // Nothing was written: take back both bubbles and give the text back to edit or resend
      setMessages((list) => list.slice(0, -2));
      setInput(text);
      const quota = err instanceof ChatError && err.code === "quota";
      setQuotaHit(quota);
      setNotice(quota ? null : err instanceof ChatError ? err.message : "No connection. Check your internet and try again.");
    } finally {
      setSending(false);
      setStatus(null);
    }
  }

  // A question handed over from the Bible (send=1) goes straight away, once
  const autoSent = useRef(false);
  useEffect(() => {
    if (!autoSend || autoSent.current || initial.length || !prompt.trim()) return;
    autoSent.current = true;
    send(prompt);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once, on arrival
  }, []);

  const last = messages[messages.length - 1];
  const lightState: LightState = sending ? (last?.text ? "speaking" : "thinking") : input ? "listening" : "idle";

  return (
    <div className="chat">
      <header className="chat-head">
        <Link href="/app/companion" className="chat-back" aria-label="Back to conversations">
          <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M15 5l-7 7 7 7" />
          </svg>
        </Link>
        <b className="chat-title">{title ?? "New conversation"}</b>
        <Light size={36} state={lightState} />
      </header>

      <div className="chat-list">
        {messages.length === 0 && (
          <div className="chat-empty">
            <Light size={90} state={lightState} />
            <h2>What’s on your heart?</h2>
            <p>Ask about a passage, ask for a prayer, or just talk. Answers quote real verses.</p>
          </div>
        )}
        {messages.map((m) =>
          m.role === "user" ? (
            <div key={m.id} className="bubble me">
              {m.text}
            </div>
          ) : (
            <Reply key={m.id} message={m} status={m === last ? status : null} />
          ),
        )}
        <div ref={end} />
      </div>

      <div className="chat-foot">
        {notice && <p className="fn-error" style={{ margin: "0 4px 8px" }}>{notice}</p>}
        {quotaHit && (
          // Someone may have just opened up about something hard: no "limit reached", and their words stay in the box
          <div className="wa-card chat-quota">
            <p>
              Thank you for sharing this with me. We’ve reached the end of this week’s conversations, and I’ll be here again
              on Monday. Your message is saved below.
            </p>
            <p className="wa-lead" style={{ fontSize: 14 }}>
              Until then, you could bring it to God in prayer, or share it with someone you trust.
            </p>
            <Link href="/app/upgrade" className="btn-ink sm" style={{ marginTop: 10 }}>
              Keep talking with Premium
            </Link>
          </div>
        )}
        <form
          className="chat-input"
          onSubmit={(e) => {
            e.preventDefault();
            send();
          }}
        >
          <textarea
            ref={box}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              // Enter sends, Shift+Enter starts a new line
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                send();
              }
            }}
            placeholder="Write a message"
            maxLength={MAX_LENGTH}
            rows={1}
            autoFocus={Boolean(prompt) && !autoSend}
            disabled={!aiEnabled}
            aria-label="Message"
          />
          <button type="submit" className="chat-send" disabled={!input.trim() || sending || !aiEnabled} aria-label="Send">
            <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M12 19V5M5 12l7-7 7 7" />
            </svg>
          </button>
        </form>
      </div>
    </div>
  );
}

function Reply({ message, status }: { message: ChatMessage; status: string | null }) {
  return (
    <div className="reply">
      <div className="bubble them">{message.text ? message.text : <i className="chat-status" key={status ?? "wait"}>{status ? `${status}…` : "…"}</i>}</div>
      {message.citations.map((v) => (
        <div key={v.ref} className="cite">
          <b>
            <BookIcon size={15} />
            {v.ref} · {v.translation}
          </b>
          <p>{v.text}</p>
        </div>
      ))}
      {message.prayer && <SavePrayer messageId={message.id} prayer={message.prayer} />}
      {message.resources && <CrisisCard resources={message.resources} />}
    </div>
  );
}

// "Save to My prayers" under an answer that holds a prayer; then a link to it
function SavePrayer({ messageId, prayer }: { messageId: string; prayer: { title: string; savedId: string | null } }) {
  const [savedId, setSavedId] = useState(prayer.savedId);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (savedId) {
    return (
      <Link href={`/app/prayers/personal/${savedId}`} className="wa-chip save-prayer">
        ✓ Saved · Open in My prayers
      </Link>
    );
  }
  return (
    <div>
      <button
        className="wa-chip save-prayer"
        disabled={saving}
        onClick={async () => {
          setSaving(true);
          setError(null);
          try {
            setSavedId((await savePrayerFromMessage(messageId)).id);
          } catch (err) {
            setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
          } finally {
            setSaving(false);
          }
        }}
      >
        {saving ? "Saving…" : "Save to My prayers"}
      </button>
      {error && <p className="pp-error">{error}</p>}
    </div>
  );
}

function CrisisCard({ resources }: { resources: CrisisResource[] }) {
  return (
    <div className="crisis">
      <b>You don’t have to go through this alone</b>
      {resources.map((r) => (
        <a key={r.href} href={r.href} className="crisis-btn">
          {r.label}
          <small>{r.note}</small>
        </a>
      ))}
    </div>
  );
}
