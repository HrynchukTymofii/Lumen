import { prisma } from "@/lib/prisma";

// Premium = any entitlement still in its paid/trial period (SPEC §4). No isPro flag to get out of sync.
export async function getPremium(userId: string) {
  return prisma.entitlement.findFirst({
    where: { userId, status: { in: ["trial", "active", "grace", "canceled"] }, currentPeriodEnd: { gt: new Date() } },
    orderBy: { currentPeriodEnd: "desc" },
  });
}
