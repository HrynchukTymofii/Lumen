"use client";

import { useEffect, useRef } from "react";
import { ArrowIcon, Light } from "@/components/kit";
import { track } from "@/lib/analytics/client";
import { SITE } from "@/lib/site";

// Checkout version 1 (lib/checkout.ts): "Start my subscription" opens this drawer from the bottom. Premium is bought
// in the App Store / Google Play only, so it says how: get the app, sign in with the same email, start the plan
// there, and it then works on the phone and here on the web.

// terms: the price line in full, for plans that aren't "first month, then" (the funnel's 4- and 12-week plans)
export type SheetPlan = { label: string; today: string; price: string; period: string; intro: boolean; terms?: string };

export function StoreSheet({
  plan,
  email,
  store,
  placement,
  onClose,
}: {
  plan: SheetPlan;
  email?: string;
  store: { id: string; href: string; name: string };
  placement: string;
  onClose: () => void;
}) {
  const panel = useRef<HTMLDivElement>(null);

  // Escape closes; focus moves into the drawer and the page behind stops scrolling
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panel.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [onClose]);

  const steps = [
    { title: `Get ${SITE.name}`, text: `Download the app from the ${store.name}. It's free.` },
    {
      title: "Sign in with the same email",
      text: email ? `Use ${email}, so your answers and your prayer path are already there.` : "Use the email you signed up with, so your prayer path is already there.",
    },
    {
      title: `Start ${plan.label.toLowerCase()} in the app`,
      text: plan.terms
        ? plan.terms
        : plan.intro
        ? `${plan.today} for the first month, then ${plan.price}/${plan.period}. Paid through the ${store.name}, cancel anytime.`
        : `${plan.price}/${plan.period}, paid through the ${store.name}. Cancel anytime.`,
    },
    { title: "Enjoy it everywhere", text: "Premium unlocks on your phone and here on the web, with the same account." },
  ];

  return (
    <div className="ss" role="presentation" onClick={onClose}>
      <div
        ref={panel}
        className="ss-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ss-title"
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        <span className="ss-grab" aria-hidden />
        <button type="button" className="ss-close" onClick={onClose} aria-label="Close">
          <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" aria-hidden>
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>

        <div className="ss-head">
          <Light size={52} state="speaking" label="" />
          <div>
            <h3 id="ss-title">Subscribe in the app</h3>
            <p>Takes about a minute. Your plan: {plan.label}, {plan.intro ? `${plan.today} today` : `${plan.price}/${plan.period}`}.</p>
          </div>
        </div>

        <ol className="ss-steps">
          {steps.map((s, i) => (
            <li key={s.title} style={{ "--i": i } as React.CSSProperties}>
              <span className="n">{i + 1}</span>
              <span>
                <b>{s.title}</b>
                <small>{s.text}</small>
              </span>
            </li>
          ))}
        </ol>

        <a
          href={store.href}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-ink full ss-cta"
          onClick={() => track("app_download_clicked", { placement: `${placement}:sheet:${store.id}` })}
        >
          Open the {store.name}
          <span className="dot">
            <ArrowIcon />
          </span>
        </a>
        <p className="fine center">On a computer? Open {SITE.name} on your phone and sign in with the same email.</p>
      </div>
    </div>
  );
}
