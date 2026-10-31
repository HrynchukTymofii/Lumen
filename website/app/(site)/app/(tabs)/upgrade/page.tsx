import type { Metadata } from "next";
import { UpgradePaywall } from "./upgrade-client";

export const metadata: Metadata = { title: "Premium" };

export default function UpgradePage() {
  return (
    <div style={{ maxWidth: 560 }}>
      <UpgradePaywall />
    </div>
  );
}
