import { Platform } from "react-native";
import Purchases, { INTRO_ELIGIBILITY_STATUS, LOG_LEVEL, PURCHASES_ERROR_CODE, type PurchasesPackage } from "react-native-purchases";
import api from "@/lib/api/client";

// In-app subscriptions through RevenueCat (SPEC §9). The RevenueCat user id is our user id (Purchases.logIn), so
// its webhook and POST /api/me/sync-purchases can tie a purchase to the account. Premium itself always comes from
// GET /api/me: a web purchase unlocks the app too.
// Without EXPO_PUBLIC_REVENUECAT_IOS_KEY / _ANDROID_KEY (public SDK keys) purchases are off and the paywall says so.

const API_KEY = Platform.select({
  ios: process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY,
  android: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY,
});

export const purchasesEnabled = Boolean(API_KEY) && Platform.OS !== "web";

let configured = false;

/** Ties purchases to the signed-in account. Safe to call on every launch. */
export async function identifyPurchases(userId: string) {
  if (!purchasesEnabled) return;
  if (!configured) {
    if (__DEV__) Purchases.setLogLevel(LOG_LEVEL.WARN);
    Purchases.configure({ apiKey: API_KEY!, appUserID: userId });
    configured = true;
    return;
  }
  await Purchases.logIn(userId);
}

export async function resetPurchases() {
  if (!configured) return;
  // Throws when RevenueCat already has an anonymous user; nothing to undo then
  await Purchases.logOut().catch(() => {});
}

// The paywall sells yearly and monthly only. The weekly product stays in the store and the offering, but isn't shown.
const SHOWN = ["ANNUAL", "MONTHLY"];

export type PeriodUnit = "DAY" | "WEEK" | "MONTH" | "YEAR";

/** An introductory offer this person can get: a free trial, or a lower first price (e.g. $2.99 for the first month). */
export interface Intro {
  free: boolean;
  price: string; // formatted, "$2.99"
  unit: PeriodUnit;
  count: number; // how many units in all, e.g. 1 MONTH, 7 DAY
}

export interface Plan {
  pkg: PurchasesPackage;
  intro: Intro | null;
}

// Google only lists offers the person is eligible for. Apple lists the intro price to everyone, so it's shown only
// when RevenueCat confirms eligibility (unknown counts as no: never promise a price someone won't get).
function introOf(pkg: PurchasesPackage, eligible: Set<string>): Intro | null {
  const product = pkg.product;
  if (Platform.OS === "android") {
    const phase = product.defaultOption?.freePhase ?? product.defaultOption?.introPhase;
    if (!phase) return null;
    return {
      free: phase.price.amountMicros === 0,
      price: phase.price.formatted,
      unit: phase.billingPeriod.unit as PeriodUnit,
      count: phase.billingPeriod.value * (phase.billingCycleCount ?? 1),
    };
  }
  const intro = product.introPrice;
  if (!intro || !eligible.has(product.identifier)) return null;
  return { free: intro.price === 0, price: intro.priceString, unit: intro.periodUnit as PeriodUnit, count: intro.periodNumberOfUnits * Math.max(1, intro.cycles) };
}

/** The yearly and monthly plans of the current offering ($rc_annual, $rc_monthly), yearly first, with their intro offers. */
export async function getPlans(): Promise<Plan[]> {
  if (!configured) return [];
  const offerings = await Purchases.getOfferings();
  const packages = (offerings.current?.availablePackages ?? [])
    .filter((p) => SHOWN.includes(p.packageType))
    .sort((a, b) => SHOWN.indexOf(a.packageType) - SHOWN.indexOf(b.packageType));

  const eligible = new Set<string>();
  const withIntro = packages.filter((p) => p.product.introPrice).map((p) => p.product.identifier);
  if (Platform.OS === "ios" && withIntro.length) {
    const result = await Purchases.checkTrialOrIntroductoryPriceEligibility(withIntro).catch(() => ({}) as Record<string, { status: INTRO_ELIGIBILITY_STATUS }>);
    for (const [id, e] of Object.entries(result)) if (e.status === INTRO_ELIGIBILITY_STATUS.INTRO_ELIGIBILITY_STATUS_ELIGIBLE) eligible.add(id);
  }
  return packages.map((pkg) => ({ pkg, intro: introOf(pkg, eligible) }));
}

// Tells the server right away, so Premium doesn't wait for the webhook
async function syncWithServer() {
  await api.post("/me/sync-purchases").catch(() => {});
}

/** Buys a package. Returns false when the person cancelled the store sheet. */
export async function buy(pkg: PurchasesPackage) {
  try {
    await Purchases.purchasePackage(pkg);
  } catch (err) {
    if ((err as { code?: string }).code === PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR) return false;
    throw err;
  }
  await syncWithServer();
  return true;
}

/** Restores earlier App Store / Google Play purchases to this account. Returns whether Premium is active. */
export async function restore() {
  const info = await Purchases.restorePurchases();
  await syncWithServer();
  return Boolean(info.entitlements.active.premium);
}

// ───────── Prayer tokens (consumables, for audio prayers) ─────────
// Sold in their own offering, "prayer_tokens" (packages five and fifteen), outside the premium entitlement. The
// server owns the balance: after a purchase it reads RevenueCat and grants each store transaction once.

export const TOKEN_OFFERING = "prayer_tokens";

/** The token packs, smallest first. Empty when purchases are off or the offering isn't set up. */
export async function getTokenPacks(): Promise<PurchasesPackage[]> {
  if (!configured) return [];
  const offerings = await Purchases.getOfferings();
  return [...(offerings.all[TOKEN_OFFERING]?.availablePackages ?? [])].sort((a, b) => a.product.price - b.product.price);
}

/** Buys a token pack. Returns the new balance, or null when the person cancelled the store sheet. */
export async function buyTokens(pkg: PurchasesPackage) {
  try {
    await Purchases.purchasePackage(pkg);
  } catch (err) {
    if ((err as { code?: string }).code === PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR) return null;
    throw err;
  }
  const { data } = await api.post<{ tokens: number }>("/prayers/tokens/sync");
  return data.tokens;
}
