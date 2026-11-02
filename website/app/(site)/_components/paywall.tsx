"use client";

import { useEffect } from "react";
import { CheckIcon } from "@/components/kit";
import { track } from "@/lib/analytics/client";
import { FREE_FEATURES, PREMIUM_FEATURES, plansFor, priceLine } from "@/lib/plans";
import { StoreButtons } from "./store-buttons";
import { usePrices } from "./use-prices";

// Paywall used by the funnel and by /app/upgrade (SPEC §8.4). There is no web checkout: Premium is bought in the
// App Store / Google Play, so this shows the plans and sends people to the app, where they sign in with the same
// email and subscribe. Variant A: Free vs Premium first. Variant B: the three steps first.
// No countdowns, no fake discounts; "continue free" is always visible.
export function Paywall({
  variant,
  name,
  email,
  placement,
  onFree,
}: {
  variant: "A" | "B";
  name?: string;
  email?: string;
  placement: "funnel" | "settings";
  onFree: () => void;
}) {
  const prices = usePrices();
  const PLANS = plansFor(prices);
  const intro = PLANS.yearly.intro;
  useEffect(() => {
    track("paywall_viewed", { variant, placement });
  }, [variant, placement]);

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
  const steps = (
    <ol className="pw-timeline">
      <li>
        <b>Get the app</b>Free to download
      </li>
      <li>
        <b>Sign in</b>
        {email ? `With ${email}: your answers and prayer path are already there` : "Your prayer path is saved to your account"}
      </li>
      <li>
        <b>Choose Premium</b>
        {intro ? `${intro} for your first month, then ${PLANS.yearly.price} a year` : `${PLANS.yearly.price} a year`}
      </li>
    </ol>
  );

  return (
    <div className="pw">
      <h2>{name ? `${name}, your 7-day prayer path is ready` : "Your 7-day prayer path is ready"}</h2>
      <p className="sub">
        Open it in the app. {intro ? `Start Premium for ${intro} for the first month` : "Start Premium"}, or keep the free plan.
      </p>

      {variant === "A" ? compare : steps}

      <div className="pw-plans">
        {Object.values(PLANS).map((p) => (
          <div key={p.id} className="pw-plan">
            <span className="what">
              <b>{p.label}</b>
              <small>{p.note}</small>
            </span>
            <span className="amt">
              {p.price}
              <small>/{p.period}</small>
            </span>
            {p.intro && <span className="badge">First month {p.intro}</span>}
          </div>
        ))}
      </div>

      <StoreButtons placement={placement === "funnel" ? "funnel_paywall" : "web_upgrade"} />
      <p className="fine pw-renew">
        {email ? `Sign in with ${email} and subscribe in the app. ` : "Subscribe in the app. "}
        {priceLine(prices)}
      </p>

      {variant === "B" && compare}

      <button type="button" className="pw-free" onClick={onFree}>
        Continue with the free plan
      </button>
    </div>
  );
}
