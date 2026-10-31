import "server-only";
import Stripe from "stripe";
import { HttpError } from "@/lib/admin-auth";
import type { EntitlementStatus } from "@/lib/generated/prisma/client";
import { PLANS, type PlanId } from "@/lib/plans";
import { prisma } from "@/lib/prisma";

let client: Stripe | null = null;

export function stripeConfigured() {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

export function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new HttpError(503, "Payments aren't set up yet");
  client ??= new Stripe(key);
  return client;
}

export function priceIdFor(plan: PlanId) {
  const price = process.env[PLANS[plan].stripePriceEnv];
  if (!price) throw new HttpError(503, `${PLANS[plan].stripePriceEnv} is not set`);
  return price;
}

function planForPrice(priceId: string | undefined): PlanId | null {
  for (const plan of Object.values(PLANS)) if (process.env[plan.stripePriceEnv] === priceId) return plan.id;
  return null;
}

// SPEC §9.2
function statusOf(sub: Stripe.Subscription): EntitlementStatus {
  if (sub.status === "trialing") return sub.cancel_at_period_end ? "canceled" : "trial";
  if (sub.status === "active") return sub.cancel_at_period_end || sub.cancel_at ? "canceled" : "active";
  if (sub.status === "past_due") return "grace";
  return "expired";
}

// Called from the webhook for every subscription change; safe to run twice.
export async function syncSubscription(sub: Stripe.Subscription) {
  const userId = sub.metadata.userId;
  if (!userId) return console.warn(`[stripe] subscription ${sub.id} has no userId in metadata`);
  if (!(await prisma.user.findUnique({ where: { id: userId }, select: { id: true } }))) return;

  const item = sub.items.data[0];
  const productId = planForPrice(item?.price.id) ?? item?.price.id ?? "unknown";
  const status = statusOf(sub);
  const data = {
    userId,
    source: "stripe" as const,
    productId,
    status,
    trialEndsAt: sub.trial_end ? new Date(sub.trial_end * 1000) : null,
    // Since API 2025-03 the period lives on the item; the status already says if access continues
    currentPeriodEnd: new Date((item?.current_period_end ?? sub.ended_at ?? Date.now() / 1000) * 1000),
    canceledAt: sub.canceled_at ? new Date(sub.canceled_at * 1000) : null,
  };
  await prisma.entitlement.upsert({ where: { externalId: sub.id }, create: { ...data, externalId: sub.id }, update: data });

  const customer = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
  await prisma.user.updateMany({ where: { id: userId, stripeCustomerId: null }, data: { stripeCustomerId: customer } });
  return { userId, productId, status };
}
