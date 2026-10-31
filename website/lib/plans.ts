import { SITE } from "@/lib/site";

// One source for the web paywall, the web app and (later, via GET /api/plans) the app paywall. SPEC §9.1
export const PLANS = {
  annual_59_99: {
    id: "annual_59_99",
    label: "Yearly",
    price: SITE.prices.yearly,
    period: "year",
    note: "$5 a month",
    trialDays: SITE.prices.trialDays,
    stripePriceEnv: "STRIPE_PRICE_ANNUAL",
  },
  monthly_9_99: {
    id: "monthly_9_99",
    label: "Monthly",
    price: SITE.prices.monthly,
    period: "month",
    note: "No trial, cancel anytime",
    trialDays: 0,
    stripePriceEnv: "STRIPE_PRICE_MONTHLY",
  },
} as const;

export type PlanId = keyof typeof PLANS;
export const PLAN_IDS = Object.keys(PLANS) as PlanId[];

export function renewalLine(id: PlanId) {
  const p = PLANS[id];
  return p.trialDays
    ? `Free for ${p.trialDays} days, then ${p.price} per ${p.period}. Cancel anytime in 2 taps. We'll email you 2 days before you're charged.`
    : `${p.price} per ${p.period}, renews automatically. Cancel anytime in 2 taps.`;
}

export const FREE_FEATURES = [
  "Full Bible: WEB, KJV, Douay-Rheims",
  "Verse of the day",
  "One daily prayer",
  "Companion: 5 messages a day",
  "Weekly goal that forgives missed days",
];
export const PREMIUM_FEATURES = [
  "Unlimited companion chat",
  "Personal daily prayer, text and audio",
  "Full guided prayer library",
  "Prayer journal and history",
  "7-day and 30-day prayer paths",
];
