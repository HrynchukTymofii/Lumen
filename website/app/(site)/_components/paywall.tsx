"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { ArrowIcon, CheckIcon } from "@/components/kit";
import { track } from "@/lib/analytics/client";
import { CHECKOUT } from "@/lib/checkout";
import { plansFor, type PlanId } from "@/lib/plans";
import { SITE } from "@/lib/site";
import { PaywallArt } from "./paywall-art";
import { StoreSheet } from "./store-sheet";
import { usePrices } from "./use-prices";

// Paywall used by the funnel and by /app/upgrade (SPEC §8.4). There is no web checkout: Premium is bought in the
// App Store / Google Play, so picking a plan here only chooses what the button says; the button opens the store,
// where they sign in with the same email and subscribe. What the button does is switchable (lib/checkout.ts): a
// drawer explaining that, or a checkout mock-up page. Kept short on purpose: three reasons, two plans, one button.
// No countdowns, no fake discounts; "continue free" is always visible.
// `variant` is still recorded for analytics, but both variants now show the same paywall.
const REASONS = ["Your full 7-day prayer path", "A personal prayer every day, with audio", "Unlimited companion chat"];

const noop = () => () => {};

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
  const plans = plansFor(prices);
  const [plan, setPlan] = useState<PlanId>("yearly");
  const [sheet, setSheet] = useState(false);
  const closeSheet = useCallback(() => setSheet(false), []);
  const router = useRouter();
  useEffect(() => {
    track("paywall_viewed", { variant, placement });
  }, [variant, placement]);

  // Android visitors go to Google Play when it has a link, everyone else to the App Store
  const android = useSyncExternalStore(
    noop,
    () => /android/i.test(navigator.userAgent),
    () => false,
  );
  const store =
    android && SITE.stores.googlePlay
      ? { id: "play_store", href: SITE.stores.googlePlay, name: "Google Play" }
      : { id: "app_store", href: SITE.stores.appStore, name: "App Store" };
  const chosen = plans[plan];
  const today = chosen.intro ?? chosen.price;

  return (
    <div className="pw">
      <PaywallArt />
      <h2>{name ? `${name}, keep your path going` : "Keep your path going"}</h2>

      <ul className="pw-reasons">
        {REASONS.map((r) => (
          <li key={r}>
            <CheckIcon size={14} />
            {r}
          </li>
        ))}
      </ul>

      <div className="pw-plans" role="radiogroup" aria-label="Plan">
        {Object.values(plans).map((p) => (
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
            <i className="radio" aria-hidden />
            <span className="what">
              <b>{p.label}</b>
              <small>{p.intro ? `${p.intro} for the first month` : p.note}</small>
            </span>
            <span className="amt">
              {p.price}
              <small>/{p.period}</small>
            </span>
            {p.intro && <span className="badge">Best value</span>}
          </button>
        ))}
      </div>

      <button
        type="button"
        className="btn-ink full pw-cta"
        onClick={() => {
          const where = placement === "funnel" ? "funnel_paywall" : "web_upgrade";
          track("app_download_clicked", { placement: `${where}:${CHECKOUT.storeSheet ? "sheet_opened" : "checkout"}:${plan}` });
          if (CHECKOUT.storeSheet) setSheet(true);
          else router.push(`/checkout?plan=${plan}`);
        }}
      >
        Start for {today}
        <span className="dot">
          <ArrowIcon />
        </span>
      </button>
      <p className="fine pw-renew">
        {email ? `Subscribe in the app with ${email}. ` : "Subscribe in the app. "}
        Renews automatically, cancel anytime.
      </p>

      <button type="button" className="pw-free" onClick={onFree}>
        Continue with the free plan
      </button>

      {sheet && (
        <StoreSheet
          plan={{ label: chosen.label, today, price: chosen.price, period: chosen.period, intro: Boolean(chosen.intro) }}
          email={email}
          store={store}
          placement={placement === "funnel" ? "funnel_paywall" : "web_upgrade"}
          onClose={closeSheet}
        />
      )}
    </div>
  );
}
