"use client";

import { useState } from "react";
import { ArrowIcon } from "@/components/kit";
import { SUPPORT_MESSAGE_MAX, SUPPORT_TOPICS, type SupportTopic } from "@/lib/support";
import { post } from "../_components/post";

// The Contact & Support form: POST /api/support, which emails the support inbox (Reply-To: the sender)
export function SupportForm({ defaultEmail, defaultName }: { defaultEmail?: string; defaultName?: string }) {
  const [email, setEmail] = useState(defaultEmail ?? "");
  const [name, setName] = useState(defaultName ?? "");
  const [topic, setTopic] = useState<SupportTopic | "">("");
  const [message, setMessage] = useState("");
  const [website, setWebsite] = useState(""); // honeypot
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    if (!topic) return setError("Please choose what it's about.");
    if (message.trim().length < 10) return setError("Please tell us a little more.");
    setBusy(true);
    setError(null);
    try {
      await post("/api/support", { email, name: name || undefined, topic, message, platform: "web", website });
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    }
    setBusy(false);
  }

  if (sent) {
    return (
      <div className="support-form support-sent" role="status">
        <h3>Thank you, we got your message.</h3>
        <p>
          We&apos;ll reply to <b>{email}</b> within two working days.
        </p>
        <button
          type="button"
          className="btn-line"
          onClick={() => {
            setSent(false);
            setMessage("");
            setTopic("");
          }}
        >
          Send another message
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="support-form" noValidate={false}>
      <div className="support-row">
        <label>
          <span>Your email</span>
          <input type="email" required autoComplete="email" maxLength={200} placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label>
          <span>
            Name <i>(optional)</i>
          </span>
          <input type="text" autoComplete="name" maxLength={100} value={name} onChange={(e) => setName(e.target.value)} />
        </label>
      </div>
      <label>
        <span>What&apos;s it about?</span>
        <select required value={topic} onChange={(e) => setTopic(e.target.value as SupportTopic)}>
          <option value="" disabled>
            Choose a topic
          </option>
          {Object.entries(SUPPORT_TOPICS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span>Message</span>
        <textarea
          required
          rows={6}
          maxLength={SUPPORT_MESSAGE_MAX}
          placeholder="Tell us what happened. If it's about a payment, include the email you paid with."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
      </label>
      <label className="support-hp" aria-hidden="true">
        Leave this empty
        <input type="text" tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
      </label>
      {error && (
        <p className="fn-error" role="alert">
          {error}
        </p>
      )}
      <button type="submit" className="btn-ink" disabled={busy}>
        {busy ? "Sending…" : "Send message"}
        <span className="dot">
          <ArrowIcon />
        </span>
      </button>
    </form>
  );
}
