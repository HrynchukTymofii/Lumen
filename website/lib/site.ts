// Public facts about the service, used by the footer and the legal pages.
// TODO(before launch): replace every [bracketed] value, then have the legal pages reviewed.
export const SITE = {
  name: "Lumen",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  operator: "[Your full legal name or company name]",
  operatorAddress: "[Postal address]",
  contactEmail: "[support@your-domain.com]",
  privacyEmail: "[privacy@your-domain.com]",
  governingLaw: "[State / country whose law governs the Terms, e.g. the State of Delaware, USA]",
  legalUpdated: "31 October 2026",
  minAge: 13,
  prices: { monthly: "$9.99", yearly: "$59.99", trialDays: 7 },
} as const;
