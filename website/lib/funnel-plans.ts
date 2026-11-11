// The web funnel's plans (v3, from the "LTV final version" model): a paid intro, then a renewal every 4 or 12 weeks.
// US dollars. In store mode these must exist as App Store / Google Play products with the same prices
// (not created yet); in stripe mode they will be Stripe prices. `offer`: the cheaper intro on "Before you go".

export type FunnelPlanId = "trial" | "w4" | "w12";
export type FunnelPlan = {
  id: FunnelPlanId;
  label: string;
  flag?: string;
  /** Paid today */
  now: number;
  /** What `now` covers, shown under the price */
  unit: string;
  /** The renewal price and how often */
  then: number;
  every: string;
  /** Days until the first renewal */
  days: number;
  offer: number;
};

export const FUNNEL_PLANS: FunnelPlan[] = [
  { id: "trial", label: "7-day trial", now: 5.99, unit: "for 7 days", then: 39.99, every: "every 4 weeks", days: 7, offer: 4.99 },
  { id: "w4", label: "4 weeks", flag: "Most popular", now: 17.99, unit: "first 4 weeks", then: 39.99, every: "every 4 weeks", days: 28, offer: 14.99 },
  { id: "w12", label: "12 weeks", now: 34.99, unit: "first 12 weeks", then: 79.99, every: "every 12 weeks", days: 84, offer: 29.99 },
];
export const DEFAULT_FUNNEL_PLAN: FunnelPlanId = "w4";
export const funnelPlan = (id: string | null | undefined) => FUNNEL_PLANS.find((p) => p.id === id);

// Add-on "Personal audio prayers": billed and canceled together with the plan. `per4` is per 4 weeks of renewal.
export const ADDON = { now: 15, per4: 30, offerNow: 10, offerPer4: 20 };
export function addonRenewal(plan: FunnelPlan, offer: boolean) {
  const per4 = offer ? ADDON.offerPer4 : ADDON.per4;
  return plan.id === "w12" ? `${usd(per4 * 3)} every 12 weeks` : `${usd(per4)} every 4 weeks`;
}

export const usd = (n: number) => "$" + (Number.isInteger(n) ? String(n) : n.toFixed(2));
