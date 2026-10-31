"use client";

import { useEffect, useState } from "react";
import { ArrowIcon, CheckIcon } from "@/components/kit";
import { track } from "@/lib/analytics/client";
import { FREE_FEATURES, PLANS, PREMIUM_FEATURES, renewalLine, type PlanId } from "@/lib/plans";
import { post } from "./post";

// Paywall used by the funnel and by /app/upgrade (SPEC §8.4). Variant A: Free vs Premium first.
// Variant B: trial timeline first. No countdowns, no fake discounts; "continue free" is always visible.
export function Paywall({
  variant,
  name,
  placement,
  funnelSlug,
  onFree,
}: {
  variant: "A" | "B";
  name?: string;
  placement: "funnel" | "settings";
  funnelSlug?: string;
  onFree: () => void;
}) {
  const [plan, setPlan] = useState<PlanId>("annual_59_99");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    track("paywall_viewed", { variant, placement });
  }, [variant, placement]);

  async function checkout() {
    setBusy(true);
    setError(null);
    track("checkout_started", { product_id: plan });
    try {
      const { url } = await post<{ url: string }>("/api/stripe/checkout", {
        productId: plan,
        from: placement === "funnel" ? "funnel" : "app",
        funnelSlug,
      });
      window.location.href = url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setBusy(false);
    }
  }

  const trial = PLANS[plan].trialDays;
  const compare = (
    <div className="pw-compare">
      <div>
        <b>Free, forever</b>
        <ul>
          {FREE_FEATURES.map((f) => (
            <li key={f}>{f}</li>
          ))}
        </ul>
      </div>
      <div className="bg-butter">
        <b>Premium</b>
        <ul>
          {PREMIUM_FEATURES.map((f) => (
            <li key={f}>
              <CheckIcon size={13} />
              {f}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
  const timeline = (
    <ol className="pw-timeline">
      <li>
        <b>Today</b>Full access to everything in Premium
      </li>
      <li>
        <b>Day 5</b>We email you a reminder
      </li>
      <li>
        <b>Day 7</b>Your plan starts. Cancel before and you pay nothing
      </li>
    </ol>
  );

  return (
    <div className="pw">
      <h2>{name ? `${name}, your 7-day prayer path is ready` : "Your 7-day prayer path is ready"}</h2>
      <p className="sub">Pray with it free for {PLANS.annual_59_99.trialDays} days. Keep the free plan after if you like.</p>

      {variant === "A" ? compare : timeline}

      <div className="pw-plans" role="radiogroup" aria-label="Choose a plan">
        {Object.values(PLANS).map((p) => (
          <button
            key={p.id}
            type="button"
            role="radio"
            aria-checked={plan === p.id}
            className={`pw-plan ${plan === p.id ? "on" : ""}`}
            onClick={() => {
              setPlan(p.id);
              track("plan_selected", { product_id: p.id });
            }}
          >
            <span className="radio" />
            <span className="what">
              <b>{p.label}</b>
              <small>{p.note}</small>
            </span>
            <span className="amt">
              {p.price}
              <small>/{p.period}</small>
            </span>
            {p.trialDays > 0 && <span className="badge">{p.trialDays} days free</span>}
          </button>
        ))}
      </div>

      <button type="button" className="btn-ink full" onClick={checkout} disabled={busy}>
        {busy ? "Opening checkout…" : trial ? "Start my free week" : "Continue"}
        <span className="dot">
          <ArrowIcon />
        </span>
      </button>
      <p className="fine pw-renew">{renewalLine(plan)}</p>
      {error && <p className="fn-error">{error}</p>}

      {variant === "B" && compare}

      <button type="button" className="pw-free" onClick={onFree}>
        Continue with the free plan
      </button>
    </div>
  );
}
