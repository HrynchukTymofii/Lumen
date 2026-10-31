import type { Metadata } from "next";
import { SITE } from "@/lib/site";
import { DocPage } from "../_components/doc-page";

export const metadata: Metadata = { title: "Delete your account", description: `How to delete your ${SITE.name} account and data.` };

export default function DeleteAccountPage() {
  return (
    <DocPage eyebrow="Your data" title="Delete your account">
      <p>You can delete your {SITE.name} account and everything in it at any time.</p>

      <h2>In the app or on the web</h2>
      <ol>
        <li>Sign in and open <b>Settings</b>.</li>
        <li>Tap <b>Delete account</b> and confirm.</li>
      </ol>

      <h2>By email</h2>
      <p>
        Can&apos;t sign in? Email <a href={`mailto:${SITE.privacyEmail}`}>{SITE.privacyEmail}</a> from the address on your
        account with the subject &quot;Delete my account&quot;. We&apos;ll confirm it&apos;s you and delete the account
        within 30 days.
      </p>

      <h2>What gets deleted</h2>
      <ul>
        <li>Your profile and quiz answers</li>
        <li>Saved prayers, intentions and journal notes</li>
        <li>Your companion conversations</li>
        <li>Reminders and device tokens</li>
      </ul>
      <p>
        Everything is removed from our systems within 30 days and from backups within a further 30 days. We keep only records
        we must keep by law, such as payment and tax records, and nothing that identifies you for any other purpose.
      </p>

      <div className="callout bg-butter">
        <b>Subscribed through the App Store?</b> Deleting your account does not cancel the Apple subscription. Cancel it first
        in Settings → your name → Subscriptions, so you aren&apos;t charged again. Web subscriptions are cancelled
        automatically when you delete your account.
      </div>
    </DocPage>
  );
}
