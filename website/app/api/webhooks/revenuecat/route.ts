import { timingSafeEqual } from "node:crypto";
import { revenueCatConfigured, syncRevenueCat } from "@/lib/revenuecat";

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
};

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
    for (const id of ids) await syncRevenueCat(id);
  } catch (err) {
    // A 500 makes RevenueCat retry later
    console.error(`[revenuecat webhook] ${event.type} ${event.id}`, err);
    return Response.json({ error: "Failed" }, { status: 500 });
  }
  return Response.json({ ok: true });
}
