import type { EntitlementSource, EntitlementStatus } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";

// In-app subscriptions (SPEC §9). The app calls Purchases.logIn(user.id), so RevenueCat's app_user_id is our user id.
// Both the webhook and the app (after a purchase) call syncRevenueCat, which reads the customer's current state
// from RevenueCat's REST API and saves it as one Entitlement row per user. Reading the state instead of applying
// each event keeps it right however late or out of order the webhooks arrive.

export const ENTITLEMENT_ID = "lumen_premium"; // the entitlement identifier in RevenueCat

export function revenueCatConfigured() {
  return Boolean(process.env.REVENUECAT_SECRET_KEY);
}

type RcSubscription = {
  store: string; // app_store | play_store | stripe | promotional | …
  period_type: string; // normal | trial | intro
  expires_date: string | null;
  unsubscribe_detected_at: string | null;
  billing_issues_detected_at: string | null;
};

type RcSubscriber = {
  subscriber: {
    entitlements: Record<string, { expires_date: string | null; product_identifier: string }>;
    subscriptions: Record<string, RcSubscription>;
    // One-time purchases (prayer token packs): every transaction per product
    non_subscriptions?: Record<string, RcNonSubscription[]>;
  };
};

export type RcNonSubscription = {
  id: string;
  store_transaction_id?: string | null;
  purchase_date: string;
  store: string;
  is_sandbox: boolean;
};

export async function fetchSubscriber(userId: string): Promise<RcSubscriber> {
  const res = await fetch(`https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(userId)}`, {
    headers: { Authorization: `Bearer ${process.env.REVENUECAT_SECRET_KEY}` },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`RevenueCat ${res.status}: ${await res.text()}`);
  return res.json();
}

const sourceFor = (store: string): EntitlementSource => (store === "play_store" ? "play" : "app_store");

function statusFor(sub: RcSubscription | undefined, expires: Date): EntitlementStatus {
  if (expires <= new Date()) return "expired";
  if (sub?.billing_issues_detected_at) return "grace";
  if (sub?.unsubscribe_detected_at) return "canceled"; // access until the period ends
  if (sub?.period_type === "trial") return "trial";
  return "active";
}

/** Saves the user's RevenueCat state. Returns false when the user isn't ours (e.g. an anonymous RevenueCat id). */
export async function syncRevenueCat(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
  if (!user) return false;

  const { subscriber } = await fetchSubscriber(userId);
  const ent = subscriber.entitlements[ENTITLEMENT_ID];
  const externalId = `revenuecat:${userId}`;

  if (!ent) {
    // Never bought, or RevenueCat dropped it (refund, transfer): no access
    await prisma.entitlement.updateMany({ where: { externalId }, data: { status: "expired", currentPeriodEnd: new Date() } });
    return true;
  }

  const sub = subscriber.subscriptions[ent.product_identifier];
  // Lifetime / promotional grants have no expiry: treat as far in the future
  const currentPeriodEnd = ent.expires_date ? new Date(ent.expires_date) : new Date("2100-01-01");
  const status = statusFor(sub, currentPeriodEnd);
  const data = {
    source: sourceFor(sub?.store ?? "app_store"),
    // The store's own product id (Google Play ids can carry a base plan: "lumen_yearly:yearly"); planOf() in
    // lib/plans.ts turns it into yearly / monthly for display. Weekly has no website plan and shows as "Premium".
    productId: ent.product_identifier,
    status,
    currentPeriodEnd,
    trialEndsAt: status === "trial" ? currentPeriodEnd : null,
    canceledAt: sub?.unsubscribe_detected_at ? new Date(sub.unsubscribe_detected_at) : null,
  };
  await prisma.entitlement.upsert({ where: { externalId }, create: { userId, externalId, ...data }, update: data });
  return true;
}
