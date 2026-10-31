import { Platform } from "react-native";
import Purchases, { LOG_LEVEL, PURCHASES_ERROR_CODE, type PurchasesPackage } from "react-native-purchases";
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

/** The packages of the current offering ($rc_annual, $rc_monthly), yearly first. */
export async function getPackages(): Promise<PurchasesPackage[]> {
  if (!configured) return [];
  const offerings = await Purchases.getOfferings();
  const packages = offerings.current?.availablePackages ?? [];
  return [...packages].sort((a) => (a.packageType === "ANNUAL" ? -1 : 1));
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
