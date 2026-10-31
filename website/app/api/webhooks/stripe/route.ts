import type Stripe from "stripe";
import { trackServer } from "@/lib/analytics/server";
import { Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { getStripe, syncSubscription } from "@/lib/stripe";

// Stripe → Entitlement (SPEC §6.2, §9.2). Signature checked, each event handled once (WebhookEvent).
export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return Response.json({ error: "STRIPE_WEBHOOK_SECRET is not set" }, { status: 503 });

  const stripe = getStripe();
  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(await req.text(), req.headers.get("stripe-signature") ?? "", secret);
  } catch {
    return Response.json({ error: "Bad signature" }, { status: 400 });
  }

  try {
    await prisma.webhookEvent.create({ data: { id: event.id, provider: "stripe", type: event.type } });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") return Response.json({ ok: true, duplicate: true });
    throw err;
  }

  try {
    await handleEvent(stripe, event);
  } catch (err) {
    // Let Stripe retry: forget the event so the retry isn't skipped as a duplicate
    await prisma.webhookEvent.delete({ where: { id: event.id } }).catch(() => {});
    console.error(`[stripe webhook] ${event.type}`, err);
    return Response.json({ error: "Failed" }, { status: 500 });
  }
  return Response.json({ ok: true });
}

async function handleEvent(stripe: Stripe, event: Stripe.Event) {
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;
      if (session.subscription) {
        const id = typeof session.subscription === "string" ? session.subscription : session.subscription.id;
        await syncSubscription(await stripe.subscriptions.retrieve(id));
      }
      return;
    }
    case "customer.subscription.created": {
      const result = await syncSubscription(event.data.object);
      if (result) {
        const sub = event.data.object;
        const price = (sub.items.data[0]?.price.unit_amount ?? 0) / 100;
        if (result.status === "trial") await trackServer(result.userId, "trial_started", { product_id: result.productId, source: "web" });
        else await trackServer(result.userId, "subscription_started", { product_id: result.productId, source: "web", price });
      }
      return;
    }
    case "customer.subscription.updated": {
      const before = event.data.previous_attributes;
      const result = await syncSubscription(event.data.object);
      if (result?.status === "canceled" && before && "cancel_at_period_end" in before) {
        await trackServer(result.userId, "subscription_canceled", { product_id: result.productId, source: "web" });
      }
      return;
    }
    case "customer.subscription.deleted":
      await syncSubscription(event.data.object);
      return;
    case "invoice.paid": {
      const sub = event.data.object.parent?.subscription_details?.subscription;
      if (sub) {
        const result = await syncSubscription(await stripe.subscriptions.retrieve(typeof sub === "string" ? sub : sub.id));
        if (result && event.data.object.billing_reason === "subscription_cycle") {
          await trackServer(result.userId, "subscription_renewed", { product_id: result.productId, source: "web" });
        }
      }
      return;
    }
    case "charge.refunded": {
      const customer = event.data.object.customer;
      const user = customer
        ? await prisma.user.findUnique({ where: { stripeCustomerId: typeof customer === "string" ? customer : customer.id } })
        : null;
      if (user) await trackServer(user.id, "refund_issued", { product_id: "unknown", source: "web" });
      return;
    }
  }
}
