import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { getCurrentUser } from "@/lib/auth/current";
import { SITE } from "@/lib/site";
import { DocPage } from "../_components/doc-page";
import { SupportForm } from "./support-form";

export const metadata: Metadata = { title: "Contact & Support", description: `Help with ${SITE.name}: subscriptions, refunds and your account.` };

const HELP = [
  [
    "How do I cancel my subscription?",
    <>
      <b>iPhone:</b> open Settings → tap your name → Subscriptions → {SITE.name} → Cancel Subscription.{" "}
      <b>Android:</b> open the Play Store app → your profile → Payments &amp; subscriptions → Subscriptions → {SITE.name}{" "}
      → Cancel. You keep Premium until the end of the period you paid for. Deleting the app or your account doesn&apos;t
      cancel it.
    </>,
  ],
  [
    "How do I get a refund?",
    <>
      Subscriptions are sold by Apple and Google, so they handle refunds. iPhone: go to{" "}
      <a href="https://reportaproblem.apple.com">reportaproblem.apple.com</a>. Android: open{" "}
      <a href="https://play.google.com/store/account/orderhistory">your Google Play order history</a> and choose Request
      a refund.
    </>,
  ],
  [
    "I paid but Premium isn't showing",
    <>
      Make sure you&apos;re signed in to the same {SITE.name} account you subscribed with. In the app, open Settings →
      Subscription → Restore purchases. Still stuck? Email us with your account email and, if you can, the order number
      from your App Store or Google Play receipt.
    </>,
  ],
  [
    "I'm not receiving the sign-in email",
    <>Check your spam folder, wait a minute and try again, and make sure the address is spelled correctly. Codes work for 15 minutes.</>,
  ],
  [
    "Can I turn off the AI?",
    <>Yes. Settings → AI companion → off. You keep the Bible, the prayer library, verse of the day and your journal.</>,
  ],
  [
    "How do I delete my account?",
    <>
      See <Link href="/delete-account">Delete your account</Link>.
    </>,
  ],
] as const;

// Reads the session cookie, so it sits in <Suspense>: the rest of the page is prerendered, and signed-in users get
// their email filled in once this resolves
async function PrefilledForm() {
  const user = await getCurrentUser().catch(() => null);
  return <SupportForm defaultEmail={user?.email} defaultName={user?.firstName ?? undefined} />;
}

export default function SupportPage() {
  return (
    <DocPage eyebrow="Help" title="Contact & Support">
      <p>
        We&apos;re a small team and read every message. Send us a note below and we&apos;ll reply within two working days, or
        email <a href={`mailto:${SITE.contactEmail}`}>{SITE.contactEmail}</a>.
      </p>
      <Suspense fallback={<SupportForm />}>
        <PrefilledForm />
      </Suspense>
      <div className="callout bg-rose">
        <b>Need help right now?</b> {SITE.name} isn&apos;t an emergency service. If you&apos;re in crisis or thinking about
        harming yourself, call or text <b>988</b> (US), call <b>911</b>, or your local emergency number.
      </div>
      <h2>Common questions</h2>
      {HELP.map(([q, a]) => (
        <details key={q}>
          <summary>{q}</summary>
          <p>{a}</p>
        </details>
      ))}
    </DocPage>
  );
}
