import { Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { fetchSubscriber } from "@/lib/revenuecat";

// Prayer tokens: consumables bought in the app (App Store / Google Play through RevenueCat), spent on audio prayers.
// User.prayerTokens is the balance; every change is a TokenLedger row. Store transactions are granted once
// (TokenLedger.transactionId is unique), so the app's sync and the webhook can both run for the same purchase.

export const TOKENS_PER_PRODUCT: Record<string, number> = {
  lumen_prayer_tokens_5: 5,
  lumen_prayer_tokens_15: 15,
};

// Google Play ids can carry a suffix ("lumen_prayer_tokens_5:…"); the part before ":" is the product
export const tokensOf = (productId: string | undefined | null) => (productId ? (TOKENS_PER_PRODUCT[productId.split(":")[0]] ?? 0) : 0);

const isUnique = (err: unknown) => err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002";

export async function tokenBalance(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { prayerTokens: true } });
  return user?.prayerTokens ?? 0;
}

/** Adds the tokens of one store transaction. False when it was already granted. */
export async function grantTransaction(userId: string, transactionId: string, productId: string) {
  const tokens = tokensOf(productId);
  if (!tokens) return false;
  try {
    await prisma.$transaction([
      prisma.tokenLedger.create({ data: { userId, delta: tokens, reason: "purchase", transactionId, productId } }),
      prisma.user.update({ where: { id: userId }, data: { prayerTokens: { increment: tokens } } }),
    ]);
    return true;
  } catch (err) {
    if (isUnique(err)) return false;
    throw err;
  }
}

/** Grants every token purchase RevenueCat knows about that we haven't granted yet. Returns the new balance. */
export async function grantPurchasedTokens(userId: string) {
  const exists = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
  if (!exists) return null;
  const { subscriber } = await fetchSubscriber(userId);
  for (const [productId, purchases] of Object.entries(subscriber.non_subscriptions ?? {})) {
    if (!tokensOf(productId)) continue;
    for (const p of purchases) await grantTransaction(userId, p.store_transaction_id || p.id, productId);
  }
  return tokenBalance(userId);
}

/** A refunded store purchase: takes its tokens back, never below 0, once. */
export async function revokeTransaction(userId: string, transactionId: string) {
  const granted = await prisma.tokenLedger.findUnique({ where: { transactionId } });
  if (!granted || granted.reason !== "purchase" || granted.userId !== userId) return false;
  try {
    await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUniqueOrThrow({ where: { id: userId }, select: { prayerTokens: true } });
      const take = Math.min(granted.delta, user.prayerTokens);
      await tx.tokenLedger.create({
        data: { userId, delta: -take, reason: "store_refund", transactionId: `refund:${transactionId}`, productId: granted.productId },
      });
      if (take) await tx.user.update({ where: { id: userId }, data: { prayerTokens: { decrement: take } } });
    });
    return true;
  } catch (err) {
    if (isUnique(err)) return false;
    throw err;
  }
}

/** Takes `tokens` if the balance allows, in one statement so two requests can't both spend the same tokens. */
export async function spendTokens(userId: string, tokens: number, prayerId: string) {
  return prisma.$transaction(async (tx) => {
    const taken = await tx.$executeRaw`UPDATE "User" SET "prayerTokens" = "prayerTokens" - ${tokens} WHERE "id" = ${userId} AND "prayerTokens" >= ${tokens}`;
    if (!taken) return false;
    await tx.tokenLedger.create({ data: { userId, delta: -tokens, reason: "spend", prayerId } });
    return true;
  });
}

/** Gives tokens back after a failed recording. */
export async function refundTokens(userId: string, tokens: number, prayerId: string) {
  await prisma.$transaction([
    prisma.tokenLedger.create({ data: { userId, delta: tokens, reason: "refund", prayerId } }),
    prisma.user.update({ where: { id: userId }, data: { prayerTokens: { increment: tokens } } }),
  ]);
}

/** Uses Premium's free audio prayer of the month. False when it was already used. */
export async function useMonthlyFree(userId: string, month: string, transactionId: string, prayerId: string) {
  try {
    await prisma.tokenLedger.create({ data: { userId, delta: 0, reason: "monthly_free", month, transactionId, prayerId } });
    return true;
  } catch (err) {
    if (isUnique(err)) return false;
    throw err;
  }
}

export async function undoMonthlyFree(transactionId: string) {
  await prisma.tokenLedger.deleteMany({ where: { transactionId, reason: "monthly_free" } });
}
