"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { ArrowIcon, CheckIcon, Light } from "@/components/kit";
import { plansFor, type PlanId } from "@/lib/plans";
import { SITE } from "@/lib/site";
import { usePrices } from "../_components/use-prices";

// The checkout mock-up (see page.tsx). DEMO ONLY: the fields have no names, nothing is submitted or stored, and the
// pay buttons only show a note that this is a demo. Never connect a payment provider here: purchases are store-only.

type Method = "card" | "paypal" | "apple";

export function CheckoutMock() {
  const params = useSearchParams();
  const router = useRouter();
  const plans = plansFor(usePrices());
  const planId: PlanId = params.get("plan") === "monthly" ? "monthly" : "yearly";
  const plan = plans[planId];
  const today = plan.intro ?? plan.price;
  const [method, setMethod] = useState<Method>("card");
  const [demo, setDemo] = useState(false);

  return (
    <div className="co">
      <button type="button" className="fn-back" onClick={() => router.back()} aria-label="Back">
        <ArrowIcon size={18} />
      </button>

      <div className="co-grid">
        <section className="co-summary" aria-label="Your plan">
          <div className="co-plan">
            <Light size={44} label="" />
            <div>
              <b>
                {SITE.name} Premium · {plan.label}
              </b>
              <small>{plan.intro ? `${plan.intro} for the first month, then ${plan.price}/${plan.period}` : `${plan.price}/${plan.period}`}</small>
            </div>
          </div>
          <ul>
            <li>
              <CheckIcon size={14} /> Your full 7-day prayer path
            </li>
            <li>
              <CheckIcon size={14} /> A personal prayer every day, with audio
            </li>
            <li>
              <CheckIcon size={14} /> 200 companion messages a week
            </li>
          </ul>
          <div className="co-total">
            <span>Due today</span>
            <b>{today}</b>
          </div>
        </section>

        <form
          className="co-pay"
          autoComplete="off"
          onSubmit={(e) => {
            e.preventDefault();
            setDemo(true);
          }}
        >
          <div className="co-express">
            <button type="button" className={`co-wallet apple ${method === "apple" ? "on" : ""}`} onClick={() => (setMethod("apple"), setDemo(true))}>
              <svg width={16} height={19} viewBox="0 0 17 20" aria-hidden>
                <path
                  fill="currentColor"
                  d="M14.1 10.6c0-2.6 2.1-3.8 2.2-3.9-1.2-1.8-3.1-2-3.7-2-1.6-.2-3.1.9-3.9.9-.8 0-2-.9-3.4-.9C3.6 4.8 2 5.8 1 7.4c-1.9 3.3-.5 8.2 1.4 10.9.9 1.3 2 2.8 3.4 2.7 1.4-.1 1.9-.9 3.5-.9s2.1.9 3.5.9c1.5 0 2.4-1.3 3.3-2.7 1-1.5 1.5-3 1.5-3.1-.1 0-2.6-1-2.5-4.6zM11.5 3c.7-.9 1.2-2.1 1.1-3.3-1 0-2.3.7-3 1.6-.7.8-1.3 2-1.1 3.2 1.1.1 2.3-.6 3-1.5z"
                />
              </svg>
              Pay
            </button>
            <button type="button" className={`co-wallet paypal ${method === "paypal" ? "on" : ""}`} onClick={() => (setMethod("paypal"), setDemo(true))}>
              <b>Pay</b>
              <b>Pal</b>
            </button>
          </div>
          <div className="co-or">
            <span>or pay with card</span>
          </div>

          <label className="co-field">
            <span>Card number</span>
            <span className="co-input">
              <input inputMode="numeric" placeholder="1234 1234 1234 1234" autoComplete="off" onFocus={() => setMethod("card")} />
              <span className="co-brands" aria-hidden>
                <i className="visa">VISA</i>
                <i className="mc" />
              </span>
            </span>
          </label>
          <div className="co-two">
            <label className="co-field">
              <span>Expiry</span>
              <input inputMode="numeric" placeholder="MM / YY" autoComplete="off" />
            </label>
            <label className="co-field">
              <span>CVC</span>
              <input inputMode="numeric" placeholder="123" autoComplete="off" />
            </label>
          </div>
          <label className="co-field">
            <span>Name on card</span>
            <input placeholder="Full name" autoComplete="off" />
          </label>

          {demo && (
            <p className="co-demo" role="status">
              This is a demo checkout. No payment was taken and nothing was sent. Premium is available in the {SITE.name} app.
            </p>
          )}

          <button type="submit" className="btn-ink full">
            Start my subscription · {today}
            <span className="dot">
              <ArrowIcon />
            </span>
          </button>
          <p className="fine center co-fine">
            <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} aria-hidden>
              <rect x="4" y="10" width="16" height="11" rx="2" />
              <path d="M8 10V7a4 4 0 018 0v3" />
            </svg>
            Renews automatically, cancel anytime.
          </p>
        </form>
      </div>
    </div>
  );
}
