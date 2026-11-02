// Public facts about the service, used by the footer and the legal pages.
// Run by an individual developer under the name Fibipals (no company). The home address is left off on purpose;
// email is the contact. governingLaw: the country the developer lives in, or "" to leave it unnamed.
export const SITE = {
  name: "Lumen",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  operator: "Fibipals, an independent developer",
  operatorAddress: "",
  contactEmail: "lumen-support@fibipals.com",
  privacyEmail: "lumen-support@fibipals.com",
  governingLaw: "",
  legalUpdated: "31 October 2026",
  minAge: 13,
  prices: { monthly: "$9.99", yearly: "$59.99", trialDays: 7 },
} as const;
