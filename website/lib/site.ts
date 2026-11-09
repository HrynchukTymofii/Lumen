// Public facts about the service, used by the footer and the legal pages.
// Run by an individual developer under the name Fibipals (no company). The home address is left off on purpose;
// email is the contact. governingLaw: the country the developer lives in, or "" to leave it unnamed.
export const SITE = {
  name: "Holy Hush",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  operator: "Fibipals, an independent developer",
  operatorAddress: "",
  contactEmail: "holyhush@fibipals.com",
  privacyEmail: "holyhush@fibipals.com",
  governingLaw: "",
  legalUpdated: "7 November 2026",
  minAge: 13,
  // US App Store prices, and the fallback everywhere the synced local prices (lib/prices.ts) are missing or broken.
  // Purchases only happen in the stores (no web checkout). A weekly plan exists in the app but isn't shown here.
  prices: { yearly: "$59.99", yearlyIntro: "$2.99", monthly: "$8.99" },
  stores: {
    // The link works once the app is live on the App Store
    appStore: process.env.NEXT_PUBLIC_APP_STORE_URL ?? "https://apps.apple.com/app/id6829436290",
    // No Android app yet: empty hides the button. When it's live:
    // "https://play.google.com/store/apps/details?id=com.hrynchuk.biblecompanion"
    googlePlay: process.env.NEXT_PUBLIC_GOOGLE_PLAY_URL ?? "",
  },
} as const;
