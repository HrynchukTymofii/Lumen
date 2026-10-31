"use client";

import dynamic from "next/dynamic";

// The funnel lives on browser storage (resume after refresh, sticky paywall variant), so it renders in the browser only
export const FunnelLoader = dynamic(() => import("./funnel").then((m) => m.Funnel), {
  ssr: false,
  loading: () => <div className="fn-shell" aria-busy />,
});
