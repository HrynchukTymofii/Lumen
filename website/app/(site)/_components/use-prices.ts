"use client";

import { useEffect, useState } from "react";
import { US_PRICES, type Prices } from "@/lib/prices";

// The visitor's local prices for client components. Shows the US prices until /api/prices answers (and if it fails).
// One request per page load, shared by every caller; call prefetchPrices() early so the paywall has them ready.
let pending: Promise<Prices> | null = null;
let loaded: Prices | null = null;

export function prefetchPrices() {
  pending ??= fetch("/api/prices")
    .then((r) => (r.ok ? (r.json() as Promise<Prices>) : US_PRICES))
    .catch(() => US_PRICES)
    .then((p) => (loaded = p));
  return pending;
}

export function usePrices(): Prices {
  const [prices, setPrices] = useState<Prices>(loaded ?? US_PRICES);
  useEffect(() => {
    let live = true;
    prefetchPrices().then((p) => live && setPrices(p));
    return () => {
      live = false;
    };
  }, []);
  return prices;
}
