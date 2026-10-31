"use client";

import dynamic from "next/dynamic";
import { Paywall } from "../../../_components/paywall";

function readVariant(): "A" | "B" {
  try {
    return JSON.parse(localStorage.getItem("pc_paywall_variant") ?? "null") === "B" ? "B" : "A";
  } catch {
    return "A";
  }
}

// Same paywall and the same sticky A/B variant as the funnel (stored in this browser, so client-only)
export const UpgradePaywall = dynamic(
  async () =>
    function Upgrade() {
      return <Paywall variant={readVariant()} placement="settings" onFree={() => (window.location.href = "/app")} />;
    },
  { ssr: false },
);
