"use client";

import { useSyncExternalStore } from "react";
import { track } from "@/lib/analytics/client";
import { SITE } from "@/lib/site";

// "Get it on the App Store / Google Play". Buying happens only in the stores, so every "buy" on the website ends
// here. The visitor's own platform goes first; on a computer both show. A store without a link yet is hidden.
type Store = { id: "app_store" | "play_store"; href: string; label: string; small: string };

const noop = () => () => {};

const STORES: Store[] = [
  { id: "app_store", href: SITE.stores.appStore, label: "App Store", small: "Download on the" },
  { id: "play_store", href: SITE.stores.googlePlay, label: "Google Play", small: "Get it on" },
];

export function StoreButtons({ placement, className = "" }: { placement: string; className?: string }) {
  // false on the server, the real answer in the browser (React re-renders after hydration, no mismatch)
  const android = useSyncExternalStore(
    noop,
    () => /android/i.test(navigator.userAgent),
    () => false,
  );

  const stores = STORES.filter((s) => s.href);
  if (android) stores.reverse();
  if (!stores.length) return <p className="fine">The app is coming soon to the App Store and Google Play.</p>;

  return (
    <div className={`store-btns ${className}`}>
      {stores.map((s) => (
        <a
          key={s.id}
          href={s.href}
          className="store-btn"
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => track("app_download_clicked", { placement: `${placement}:${s.id}` })}
        >
          <small>{s.small}</small>
          {s.label}
        </a>
      ))}
    </div>
  );
}
