import type { NextRequest } from "next/server";
import { z } from "zod";
import { HttpError } from "@/lib/admin-auth";
import { handle, readJson } from "@/lib/api";
import { requireUser } from "@/lib/auth/session";
import { getPremium } from "@/lib/entitlement";
import { PLANS, PLAN_IDS } from "@/lib/plans";
import { prisma } from "@/lib/prisma";
import { SITE } from "@/lib/site";
import { getStripe, priceIdFor } from "@/lib/stripe";

const body = z.object({
  productId: z.enum(PLAN_IDS as [string, ...string[]]),
  // Where "back" in Stripe returns to: the funnel paywall or the web app
  from: z.enum(["funnel", "app"]).default("funnel"),
  funnelSlug: z.string().max(40).optional(),
});

// → { url } of a Stripe Checkout page (SPEC §6.2). The webhook, not this route, grants access.
export const POST = handle(async (req: NextRequest) => {
  const session = await requireUser(req);
  const input = body.parse(await readJson(req));
  const plan = PLANS[input.productId as keyof typeof PLANS];
  const stripe = getStripe();

  if (await getPremium(session.id)) throw new HttpError(409, "You already have Premium");
  const user = await prisma.user.findUniqueOrThrow({ where: { id: session.id } });

  const cancel =
    input.from === "app" ? `${SITE.url}/app/upgrade` : `${SITE.url}/f/${input.funnelSlug ?? "struggle"}?step=paywall`;
  const checkout = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price: priceIdFor(plan.id), quantity: 1 }],
    client_reference_id: user.id,
    ...(user.stripeCustomerId ? { customer: user.stripeCustomerId } : { customer_email: user.email }),
    metadata: { userId: user.id, productId: plan.id },
    subscription_data: {
      metadata: { userId: user.id, productId: plan.id },
      ...(plan.trialDays ? { trial_period_days: plan.trialDays } : {}),
    },
    allow_promotion_codes: false,
    success_url: `${SITE.url}/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: cancel,
  });
  if (!checkout.url) throw new HttpError(502, "Stripe didn't return a checkout page");
  return Response.json({ url: checkout.url });
});
