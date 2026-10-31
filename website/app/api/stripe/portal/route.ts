import type { NextRequest } from "next/server";
import { HttpError } from "@/lib/admin-auth";
import { handle } from "@/lib/api";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { SITE } from "@/lib/site";
import { getStripe } from "@/lib/stripe";

// → { url } of the Stripe Customer Portal: change plan, card, cancel.
export const POST = handle(async (req: NextRequest) => {
  const session = await requireUser(req);
  const user = await prisma.user.findUniqueOrThrow({ where: { id: session.id } });
  if (!user.stripeCustomerId) throw new HttpError(404, "No web subscription on this account");

  const portal = await getStripe().billingPortal.sessions.create({
    customer: user.stripeCustomerId,
    return_url: `${SITE.url}/app/settings`,
  });
  return Response.json({ url: portal.url });
});
