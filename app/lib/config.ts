// Values from .env.local / EAS env. EXPO_PUBLIC_ values are inlined at build time, so they must be
// written out in full (no destructuring) and must never hold secrets.

// The website; the API lives under /api. On a phone, localhost is the phone itself: use the computer's LAN IP.
export const SITE_URL = (process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000").replace(/\/$/, "");

// Empty = analytics off (dev builds without a key)
export const POSTHOG_KEY = process.env.EXPO_PUBLIC_POSTHOG_KEY ?? "";
export const POSTHOG_HOST = process.env.EXPO_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com";
