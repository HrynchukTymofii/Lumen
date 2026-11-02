import { SITE } from "@/lib/site";
import synced from "./prices.json";

// Local App Store prices per country, written by `npm run prices:sync` (scripts/sync-prices.ts) from the App Store
// Connect API. Keys are 2-letter country codes, the same as Vercel's x-vercel-ip-country header.
// Anything missing or odd (no sync yet, unknown country, a broken row) falls back to the US prices in lib/site.ts,
// so the site always shows a price.

type Row = { currency: string; yearly: string; monthly: string; yearlyIntro?: string | null };
export type Prices = { yearly: string; monthly: string; yearlyIntro: string | null; country: string };

const ROWS = (synced as { territories: Record<string, Row> }).territories ?? {};

const FALLBACK: Prices = { ...SITE.prices, country: "US" };

function money(amount: string, currency: string, country: string) {
  const n = Number(amount);
  if (!Number.isFinite(n) || n <= 0) return null;
  try {
    return new Intl.NumberFormat(`en-${country}`, {
      style: "currency",
      currency,
      // Whole-number currencies (JPY, KRW…) have no cents in the store either
      minimumFractionDigits: Number.isInteger(n) ? 0 : 2,
    }).format(n);
  } catch {
    return null;
  }
}

export function pricesFor(country: string | null | undefined): Prices {
  const code = (country ?? "").toUpperCase();
  const row = ROWS[code];
  if (!row) return FALLBACK;
  const yearly = money(row.yearly, row.currency, code);
  const monthly = money(row.monthly, row.currency, code);
  if (!yearly || !monthly) return FALLBACK;
  return { yearly, monthly, yearlyIntro: row.yearlyIntro ? money(row.yearlyIntro, row.currency, code) : null, country: code };
}

export const US_PRICES = FALLBACK;
