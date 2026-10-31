"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { resetAnalytics } from "@/lib/analytics/client";
import { DENOMINATIONS } from "@/funnels/options";
import { post } from "../../../_components/post";

export function ProfileForm({ firstName, denomination }: { firstName: string; denomination: string }) {
  const router = useRouter();
  const [name, setName] = useState(firstName);
  const [denom, setDenom] = useState(denomination);
  const [state, setState] = useState<"idle" | "saving" | "saved" | string>("idle");

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setState("saving");
    try {
      await post("/api/me", { firstName: name.trim() || null, denomination: denom || null }, "PATCH");
      setState("saved");
      router.refresh();
    } catch (err) {
      setState(err instanceof Error ? err.message : "Couldn't save");
    }
  }

  return (
    <form onSubmit={save}>
      <label className="wa-field">
        First name
        <input value={name} onChange={(e) => setName(e.target.value.slice(0, 40))} autoComplete="given-name" />
      </label>
      <label className="wa-field">
        Tradition
        <select value={denom} onChange={(e) => setDenom(e.target.value)}>
          <option value="">Not set</option>
          {DENOMINATIONS.map((d) => (
            <option key={d.value} value={d.value}>
              {d.label}
            </option>
          ))}
        </select>
      </label>
      <div className="wa-row" style={{ marginTop: 16 }}>
        <button type="submit" className="btn-line" disabled={state === "saving"}>
          {state === "saving" ? "Saving…" : "Save"}
        </button>
        {state === "saved" && <span className="wa-ok">Saved</span>}
        {!["idle", "saving", "saved"].includes(state) && <span className="fn-error">{state}</span>}
      </div>
    </form>
  );
}

export function SubscriptionButton() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <>
      <button
        type="button"
        className="btn-line"
        disabled={busy}
        style={{ marginTop: 12 }}
        onClick={async () => {
          setBusy(true);
          try {
            const { url } = await post<{ url: string }>("/api/stripe/portal");
            window.location.href = url;
          } catch (err) {
            setError(err instanceof Error ? err.message : "Something went wrong");
            setBusy(false);
          }
        }}
      >
        {busy ? "Opening…" : "Manage or cancel"}
      </button>
      {error && <p className="fn-error">{error}</p>}
    </>
  );
}

export function AccountActions({ hasWebSubscription }: { hasWebSubscription: boolean }) {
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function logout() {
    await post("/api/auth/logout").catch(() => {});
    resetAnalytics();
    window.location.href = "/";
  }

  async function remove() {
    try {
      await post("/api/me", undefined, "DELETE");
      resetAnalytics();
      window.location.href = "/";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    }
  }

  return (
    <div style={{ display: "grid", gap: 14, justifyItems: "start" }}>
      <button type="button" className="btn-line" onClick={logout}>
        Log out
      </button>
      {!confirming ? (
        <button type="button" className="wa-danger" onClick={() => setConfirming(true)}>
          Delete my account
        </button>
      ) : (
        <div className="wa-card bg-rose" style={{ boxShadow: "none" }}>
          <b>Delete your account and everything in it?</b>
          <p style={{ marginTop: 6, lineHeight: 1.5, fontWeight: 600 }}>
            This can&apos;t be undone.{" "}
            {hasWebSubscription
              ? "Your web subscription is cancelled right away."
              : "If you subscribed in the App Store, cancel it in your iPhone settings too."}
          </p>
          <div className="wa-row" style={{ marginTop: 12, justifyContent: "flex-start" }}>
            <button type="button" className="wa-danger" onClick={remove}>
              Yes, delete everything
            </button>
            <button type="button" className="btn-line" onClick={() => setConfirming(false)}>
              Keep my account
            </button>
          </div>
          {error && <p className="fn-error">{error}</p>}
        </div>
      )}
    </div>
  );
}
