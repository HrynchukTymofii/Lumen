"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ArrowIcon } from "@/components/kit";
import { identify, track } from "@/lib/analytics/client";
import { post } from "../../_components/post";

type LoginReply = { user: { id: string }; isNew: boolean };

export function LoginForm() {
  const params = useSearchParams();
  const token = params.get("token");
  const next = params.get("next");
  const target = next?.startsWith("/app") ? next : "/app"; // only local web app paths

  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(Boolean(token));
  const [error, setError] = useState<string | null>(null);
  const exchanged = useRef(false);

  function signedIn(reply: LoginReply) {
    identify(reply.user.id);
    window.location.href = target;
  }

  // Emailed link: sign in without typing anything
  useEffect(() => {
    if (!token || exchanged.current) return;
    exchanged.current = true;
    post<LoginReply>("/api/auth/link/exchange", { token, platform: "web" })
      .then((reply) => {
        track("login_link_used", { success: true });
        signedIn(reply);
      })
      .catch((err) => {
        track("login_link_used", { success: false });
        setError(err.message);
        setBusy(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once for the token in the URL
  }, [token]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (!sent) {
        await post("/api/auth/email/start", { email, next: target });
        setSent(true);
      } else {
        signedIn(await post<LoginReply>("/api/auth/email/verify", { email, code, platform: "web" }));
        return;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    }
    setBusy(false);
  }

  if (token && busy) return <p className="sub">Signing you in…</p>;

  return (
    <form onSubmit={submit} className="fn-q">
      <h2>{sent ? "Check your email" : "Sign in"}</h2>
      <p className="sub">
        {sent ? `We sent a 6-digit code and a sign-in link to ${email}. The code works for 15 minutes.` : "No password needed. We'll email you a code."}
      </p>
      {!sent ? (
        <input
          className="fn-input"
          type="email"
          required
          autoComplete="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      ) : (
        <input
          className="fn-input"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="\d{6}"
          maxLength={6}
          required
          autoFocus
          placeholder="123456"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
          style={{ letterSpacing: "0.4em" }}
        />
      )}
      {error && <p className="fn-error">{error}</p>}
      <button type="submit" className="btn-ink full" disabled={busy} style={{ marginTop: 18 }}>
        {busy ? "One moment…" : sent ? "Sign in" : "Email me a code"}
        <span className="dot">
          <ArrowIcon />
        </span>
      </button>
      {sent && (
        <button type="button" className="pw-free" onClick={() => (setSent(false), setCode(""))}>
          Use a different email
        </button>
      )}
    </form>
  );
}
