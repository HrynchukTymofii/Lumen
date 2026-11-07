import { timingSafeEqual } from "node:crypto";
import { trackServer } from "@/lib/analytics/server";
import { revenueCatConfigured, syncRevenueCat } from "@/lib/revenuecat";
import { grantPurchasedTokens, grantTransaction, revokeTransaction, tokensOf } from "@/lib/tokens";

// RevenueCat → Entitlement (SPEC §6.2, §9.2). RevenueCat sends the Authorization header set in its dashboard
// (Integrations → Webhooks); it must equal REVENUECAT_WEBHOOK_AUTH. Each event re-reads the customer's state, so
// repeated or out-of-order events are harmless.

type RcEvent = {
  id: string;
  type: string;
  app_user_id?: string;
  original_app_user_id?: string;
  aliases?: string[];
  transferred_from?: string[];
  transferred_to?: string[];
  product_id?: string;
  transaction_id?: string; // the store's transaction id
  store?: string; // APP_STORE | PLAY_STORE | …
  environment?: string; // PRODUCTION | SANDBOX
  period_type?: string; // TRIAL | INTRO | NORMAL
  price?: number | null; // USD
  is_trial_conversion?: boolean;
  cancel_reason?: string; // UNSUBSCRIBE | BILLING_ERROR | CUSTOMER_SUPPORT (refund) | …
  expiration_reason?: string;
};

// The purchase as a PostHog event, under our user id (the same id the app identifies with).
// Each delivery is tracked once: RevenueCat only resends after a 500, and the sync runs (and fails) before this.
async function trackPurchase(userId: string, e: RcEvent) {
  const base = {
    product_id: e.product_id ?? "unknown",
    source: e.store === "PLAY_STORE" ? ("play_store" as const) : ("app_store" as const),
    sandbox: e.environment === "SANDBOX",
  };
  const price = typeof e.price === "number" ? e.price : 0;
  switch (e.type) {
    case "NON_RENEWING_PURCHASE":
      if (tokensOf(e.product_id)) return trackServer(userId, "tokens_purchased", { ...base, tokens: tokensOf(e.product_id) });
      return;
    case "INITIAL_PURCHASE":
      if (e.period_type === "TRIAL") return trackServer(userId, "trial_started", base);
      return trackServer(userId, "subscription_started", { ...base, price });
    case "RENEWAL":
      if (e.is_trial_conversion) return trackServer(userId, "subscription_started", { ...base, price, trial_conversion: true });
      return trackServer(userId, "subscription_renewed", { ...base, price });
    case "CANCELLATION":
      if (e.cancel_reason === "CUSTOMER_SUPPORT") return trackServer(userId, "refund_issued", base);
      return trackServer(userId, "subscription_canceled", { ...base, reason: e.cancel_reason });
    case "EXPIRATION":
      return trackServer(userId, "subscription_expired", { ...base, reason: e.expiration_reason });
    case "BILLING_ISSUE":
      return trackServer(userId, "billing_issue", base);
  }
}

function authorized(req: Request) {
  const expected = process.env.REVENUECAT_WEBHOOK_AUTH;
  const got = req.headers.get("authorization");
  if (!expected || !got) return false;
  const a = Buffer.from(got);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(req: Request) {
  if (!process.env.REVENUECAT_WEBHOOK_AUTH || !revenueCatConfigured()) {
    return Response.json({ error: "REVENUECAT_WEBHOOK_AUTH / REVENUECAT_SECRET_KEY are not set" }, { status: 503 });
  }
  if (!authorized(req)) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { event } = (await req.json()) as { event: RcEvent };
  if (event.type === "TEST") return Response.json({ ok: true });

  // Every id the event touches; ids that aren't our users (anonymous $RCAnonymousID…) are skipped by the sync
  const ids = new Set(
    [event.app_user_id, event.original_app_user_id, ...(event.aliases ?? []), ...(event.transferred_from ?? []), ...(event.transferred_to ?? [])].filter(
      (id): id is string => Boolean(id) && !id!.startsWith("$RCAnonymousID"),
    ),
  );
  try {
    const ours: string[] = [];
    for (const id of ids) if (await syncRevenueCat(id)) ours.push(id);
    // A transfer touches two accounts; the purchase belongs to app_user_id when it's ours
    const buyer = ours.find((id) => id === event.app_user_id) ?? ours[0];
    // Prayer token packs (consumables): granted once per store transaction, taken back on a refund
    if (buyer && tokensOf(event.product_id)) {
      if (event.type === "NON_RENEWING_PURCHASE") {
        if (event.transaction_id) await grantTransaction(buyer, event.transaction_id, event.product_id!);
        else await grantPurchasedTokens(buyer);
      } else if (event.type === "CANCELLATION" && event.cancel_reason === "CUSTOMER_SUPPORT" && event.transaction_id) {
        await revokeTransaction(buyer, event.transaction_id);
      }
    }
    if (buyer) await trackPurchase(buyer, event);
  } catch (err) {
    // A 500 makes RevenueCat retry later
    console.error(`[revenuecat webhook] ${event.type} ${event.id}`, err);
    return Response.json({ error: "Failed" }, { status: 500 });
  }
  return Response.json({ ok: true });
}
