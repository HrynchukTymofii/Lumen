import { US_PRICES, type Prices } from "@/lib/prices";

// The plans the website shows, in the visitor's local prices (lib/prices.ts). Buying happens in the App Store /
// Google Play (RevenueCat), never on the web.
export function plansFor(prices: Prices) {
  return {
    yearly: {
      id: "yearly",
      label: "Yearly",
      price: prices.yearly,
      period: "year",
      intro: prices.yearlyIntro, // first month
      note: prices.yearlyIntro ? `${prices.yearlyIntro} for the first month` : "Best value",
    },
    monthly: { id: "monthly", label: "Monthly", price: prices.monthly, period: "month", intro: null, note: "Cancel anytime" },
  } as const;
}

export const PLANS = plansFor(US_PRICES);
export type PlanId = keyof typeof PLANS;
export const PLAN_IDS = Object.keys(PLANS) as PlanId[];

export function priceLine(p: Prices) {
  const yearly = p.yearlyIntro ? `${p.yearlyIntro} for the first month, then ${p.yearly} a year` : `${p.yearly} a year`;
  return `Yearly: ${yearly}. Or ${p.monthly} a month. Renews automatically; cancel anytime in your store settings.${p.country === "US" ? "" : " Final price is shown in the store."}`;
}

/** Which plan an entitlement's store product id belongs to (product ids look like "lumen_yearly_6999"). */
export function planOf(productId: string): { label: string } | null {
  const id = productId.toLowerCase();
  if (id.includes("year") || id.includes("annual")) return PLANS.yearly;
  if (id.includes("month")) return PLANS.monthly;
  return null;
}

export const FREE_FEATURES = [
  "Full Bible: WEB, KJV, BSB, Douay-Rheims",
  "Verse of the day",
  "One daily prayer",
  "Companion: 10 messages a week",
  "Weekly goal that forgives missed days",
];
export const PREMIUM_FEATURES = [
  "200 companion messages a week",
  "Personal daily prayer, text and audio",
  "Full guided prayer library",
  "Prayer journal and history",
  "7-day and 30-day prayer paths",
];
