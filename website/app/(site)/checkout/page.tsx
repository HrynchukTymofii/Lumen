import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Wordmark } from "@/components/kit";
import { SITE } from "@/lib/site";
import { CheckoutMock } from "./checkout-mock";
import "../_components/flow.css";

export const metadata: Metadata = { title: "Checkout", robots: { index: false } };

// Checkout version 2 (lib/checkout.ts storeSheet: false): a MOCK-UP of a web checkout, to show people. Nothing on it
// takes a payment or sends card details anywhere; real purchases happen in the App Store / Google Play only.
export default function CheckoutPage() {
  return (
    <div className="hh">
      <main className="fn">
        <header className="fn-nav">
          <Link href="/" className="brand" aria-label={`${SITE.name} home`}>
            <Wordmark />
          </Link>
        </header>
        <Suspense fallback={<div className="fn-shell" aria-busy />}>
          <CheckoutMock />
        </Suspense>
      </main>
    </div>
  );
}
