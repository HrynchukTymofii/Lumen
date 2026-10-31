"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { api, ApiError } from "../_lib/api";
import { Button, ErrorBox, Field, inputClass } from "../_lib/ui";

export function LoginForm() {
  const next = useSearchParams().get("next");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (!sent) {
        await api("/api/admin/auth/request", { method: "POST", body: { email } });
        setSent(true);
      } else {
        await api("/api/admin/auth/verify", { method: "POST", body: { email, code } });
        // Only follow local admin paths
        window.location.href = next?.startsWith("/admin") ? next : "/admin";
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-6 space-y-4">
      <Field label="Email">
        <input
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={sent}
          className={inputClass}
        />
      </Field>
      {sent && (
        <Field label="6-digit code" hint="If this email is an admin, a code is on its way (valid 15 min).">
          <input
            inputMode="numeric"
            pattern="\d{6}"
            maxLength={6}
            required
            autoFocus
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            className={`${inputClass} tracking-[0.4em]`}
          />
        </Field>
      )}
      <ErrorBox message={error} />
      <Button type="submit" disabled={busy} className="w-full">
        {sent ? "Sign in" : "Email me a code"}
      </Button>
      {sent && (
        <button type="button" onClick={() => (setSent(false), setCode(""))} className="w-full text-sm text-muted underline">
          Use a different email
        </button>
      )}
    </form>
  );
}
