"use client";

import { useEffect, useRef, useState } from "react";
import { ADDON, addonRenewal, usd, type FunnelPlan } from "@/lib/funnel-plans";
import { SITE } from "@/lib/site";

// The funnel's checkout in CHECKOUT_MODE=stripe (lib/checkout.ts): a MOCK-UP that looks like Stripe Checkout, with a
// "Test mode" badge like Stripe's own. Nothing here takes a payment: the fields have no names, nothing is read,
// stored or sent, and every pay button only pretends to process. Replace it with the real Stripe Checkout once there
// is a Stripe account (a Checkout Session for the plan, with the add-on as a second line item).

/** The audio-prayers add-on in the order: at full price, at the second-offer price, or not taken */
export type Addon = "full" | "offer" | null;
type Phase = "idle" | "processing" | "done";

const PROCESS_MS = 1400;
const DONE_MS = 900;

export function StripeCheckoutMock({
  plan,
  offer,
  addon,
  email,
  onBack,
  onPaid,
}: {
  plan: FunnelPlan;
  offer: boolean;
  addon: Addon;
  email?: string;
  onBack: () => void;
  onPaid: () => void;
}) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [method, setMethod] = useState<"apple" | "google" | "card" | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const planNow = offer ? plan.offer : plan.now;
  const addonNow = addon === "full" ? ADDON.now : addon === "offer" ? ADDON.offerNow : 0;
  const total = Math.round((planNow + addonNow) * 100) / 100;

  const pay = (m: "apple" | "google" | "card") => {
    if (phase !== "idle") return;
    setMethod(m);
    setPhase("processing");
    timers.current.push(
      setTimeout(() => setPhase("done"), PROCESS_MS),
      setTimeout(onPaid, PROCESS_MS + DONE_MS),
    );
  };
  const busy = phase !== "idle";

  return (
    <div className="sx" aria-busy={busy}>
      <div className="sx-top">
        <button type="button" className="sx-back" onClick={onBack} disabled={busy} aria-label="Back to plans">
          <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden>
            <path d="M10 3 5 8l5 5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <span className="sx-brand">
          <i aria-hidden />
          {SITE.name}
        </span>
        <span className="sx-test">Test mode</span>
      </div>

      <section className="sx-summary" aria-label="Order summary">
        <p className="sx-label">Subscribe to {SITE.name}</p>
        <p className="sx-total">
          {usd(total)}
          <small>today</small>
        </p>
        <ul className="sx-lines">
          <li>
            <span>
              {SITE.name} · {plan.label}
              <small>
                Then {usd(plan.then)} {plan.every}
              </small>
            </span>
            <b>{usd(planNow)}</b>
          </li>
          {addon && (
            <li>
              <span>
                Personal audio prayers
                <small>Then {addonRenewal(plan, addon === "offer")}</small>
              </span>
              <b>{usd(addonNow)}</b>
            </li>
          )}
          <li className="sx-due">
            <span>Total due today</span>
            <b>{usd(total)}</b>
          </li>
        </ul>
      </section>

      <div className="sx-pay">
        <button type="button" className="sx-wallet" onClick={() => pay("apple")} disabled={busy} aria-label="Pay with Apple Pay">
          <svg width="17" height="20" viewBox="0 0 17 20" fill="currentColor" aria-hidden>
            <path d="M14.1 10.6c0-2.6 2.1-3.8 2.2-3.9-1.2-1.8-3.1-2-3.7-2-1.6-.2-3.1.9-3.9.9-.8 0-2-.9-3.4-.9-1.7 0-3.3 1-4.2 2.6-1.8 3.1-.5 7.7 1.3 10.2.9 1.2 1.9 2.6 3.2 2.6 1.3-.1 1.8-.8 3.3-.8 1.6 0 2 .8 3.4.8 1.4 0 2.3-1.3 3.1-2.5 1-1.4 1.4-2.8 1.4-2.9 0 0-2.7-1-2.7-4.1zM11.5 3c.7-.9 1.2-2 1.1-3.2-1 0-2.3.7-3 1.6-.7.8-1.3 2-1.1 3.1 1.1.1 2.3-.6 3-1.5z" />
          </svg>
          <b>Pay</b>
        </button>
        <button type="button" className="sx-wallet" onClick={() => pay("google")} disabled={busy} aria-label="Pay with Google Pay">
          <svg width="19" height="19" viewBox="0 0 48 48" aria-hidden>
            <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.6 5.4 2.6 13.2l7.9 6.2C12.4 13.6 17.7 9.5 24 9.5z" />
            <path fill="#4285F4" d="M46.1 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.4c-.5 2.9-2.2 5.3-4.6 6.9l7.3 5.7c4.3-3.9 7-9.7 7-17.1z" />
            <path fill="#FBBC05" d="M10.5 28.6c-.5-1.4-.8-3-.8-4.6s.3-3.2.8-4.6l-7.9-6.2C1 16.5 0 20.1 0 24s1 7.5 2.6 10.8l7.9-6.2z" />
            <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.3-5.7c-2.2 1.5-5 2.3-8.6 2.3-6.3 0-11.6-4.1-13.5-9.9l-7.9 6.2C6.6 42.6 14.6 48 24 48z" />
          </svg>
          <b>Pay</b>
        </button>

        <div className="sx-or">
          <span>Or pay with card</span>
        </div>

        {/* Demo fields: no names, autocomplete off, never read */}
        <form
          autoComplete="off"
          onSubmit={(e) => {
            e.preventDefault();
            pay("card");
          }}
        >
          <label className="sx-field">
            <span>Email</span>
            <input type="email" defaultValue={email} placeholder="you@example.com" disabled={busy} />
          </label>
          <div className="sx-field">
            <span>Card information</span>
            <div className="sx-card">
              <span className="sx-num">
                <input inputMode="numeric" placeholder="1234 1234 1234 1234" aria-label="Card number" disabled={busy} />
                <span className="sx-brands" aria-hidden>
                  <i className="visa">VISA</i>
                  <i className="mc" />
                  <i className="amex">AMEX</i>
                </span>
              </span>
              <span className="sx-row">
                <input inputMode="numeric" placeholder="MM / YY" aria-label="Expiry" disabled={busy} />
                <input inputMode="numeric" placeholder="CVC" aria-label="CVC" disabled={busy} />
              </span>
            </div>
          </div>
          <label className="sx-field">
            <span>Cardholder name</span>
            <input placeholder="Full name on card" disabled={busy} />
          </label>
          <label className="sx-field">
            <span>Country or region</span>
            <select defaultValue="US" disabled={busy}>
              <option value="US">United States</option>
              <option value="GB">United Kingdom</option>
              <option value="CA">Canada</option>
              <option value="AU">Australia</option>
              <option value="UA">Ukraine</option>
            </select>
          </label>

          <button type="submit" className={`sx-submit ${phase}`} disabled={busy}>
            {phase === "idle" && "Subscribe"}
            {phase === "processing" && <span className="sx-spin" aria-label="Processing" />}
            {phase === "done" && (
              <svg width="22" height="22" viewBox="0 0 24 24" aria-label="Done">
                <path d="M5 12.5 10 17l9-10" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </button>
          {busy && method !== "card" && (
            <p className="sx-note" role="status">
              {phase === "done" ? "Done" : `Confirming with ${method === "apple" ? "Apple Pay" : "Google Pay"}…`}
            </p>
          )}
        </form>

        <p className="sx-fine">
          By confirming your subscription, you allow {SITE.name} to charge you for future payments in accordance with their terms. You can
          always cancel your subscription.
        </p>
        <p className="sx-demo">Demo checkout: no payment is taken and nothing you type is sent.</p>
        <p className="sx-powered">
          Powered by <b>stripe</b>
          <span>Terms</span>
          <span>Privacy</span>
        </p>
      </div>
    </div>
  );
}
