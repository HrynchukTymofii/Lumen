import type { NextRequest } from "next/server";
import { HttpError } from "@/lib/admin-auth";
import { requireUser } from "@/lib/auth/session";
import { getPremium } from "@/lib/entitlement";
import { prisma } from "@/lib/prisma";

// The signed-in user for companion routes, with their plan
export async function companionUser(req: NextRequest) {
  const session = await requireUser(req);
  const user = await prisma.user.findUnique({ where: { id: session.id } });
  if (!user) throw new HttpError(401, "Account not found");
  const premium = Boolean(await getPremium(user.id));
  return { user, premium };
}

// Per server instance, like the sample prayer; enough to stop a runaway client until the Postgres limiter lands
const hits = new Map<string, number[]>();
export function rateLimited(key: string, perMinute: number) {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < 60_000);
  hits.set(key, [...recent, now]);
  return recent.length >= perMinute;
}
