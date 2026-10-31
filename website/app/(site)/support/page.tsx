import type { Metadata } from "next";
import Link from "next/link";
import { SITE } from "@/lib/site";
import { DocPage } from "../_components/doc-page";

export const metadata: Metadata = { title: "Support", description: `Help with ${SITE.name}: subscriptions, refunds and your account.` };

const HELP = [
  [
    "How do I cancel my subscription?",
    <>
      <b>Bought in the iPhone app:</b> open Settings on your iPhone → tap your name → Subscriptions → {SITE.name} → Cancel
      Subscription. <b>Bought on our website:</b> use the &quot;Manage subscription&quot; link in your account or in any email
      from us. You keep Premium until the end of the period you paid for.
    </>,
  ],
  [
    "How do I get a refund?",
    <>
      App Store purchases are refunded by Apple: go to <a href="https://reportaproblem.apple.com">reportaproblem.apple.com</a>.
      For web purchases, email us within 14 days of the charge and we&apos;ll sort it out.
    </>,
  ],
  [
    "I paid but Premium isn't showing",
    <>
      Make sure you&apos;re signed in with the same email you used to pay. In the iPhone app, tap Settings → Restore
      purchases. Still stuck? Email us and include the email address you paid with.
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

export default function SupportPage() {
  return (
    <DocPage eyebrow="Help" title="Support">
      <p>
        We&apos;re a small team and read every message. Email{" "}
        <a href={`mailto:${SITE.contactEmail}`}>{SITE.contactEmail}</a> and we&apos;ll reply within two working days.
      </p>
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
