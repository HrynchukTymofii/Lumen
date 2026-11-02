import { router } from "expo-router";
import { hasApiToken } from "./api/client";

// Lumen can be tried without an account: reading the Bible, praying, Discover, favorites. Everything personal
// (the companion, the prayer week, reminders, Premium, Bible notes / highlights / bookmarks, the journal,
// downloads) sends someone without one to sign-in, with a line saying why.

export type AccountReason = "companion" | "premium" | "streak" | "reminders" | "notes" | "journal" | "downloads";

export const hasAccount = () => hasApiToken();

export function askToSignIn(reason?: AccountReason) {
  router.push({ pathname: "/sign-in", params: reason ? { reason } : {} });
}

/** Runs `action` with an account, otherwise opens sign-in */
export function withAccount(reason: AccountReason, action: () => void) {
  if (hasAccount()) action();
  else askToSignIn(reason);
}

/** The paywall, or sign-in first: a subscription belongs to the account, so it works on every device */
export function openPaywall() {
  if (hasAccount()) router.push("/paywall");
  else askToSignIn("premium");
}
