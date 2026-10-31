import type { Metadata } from "next";
import Link from "next/link";
import { SITE } from "@/lib/site";
import { DocPage } from "../_components/doc-page";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: `How ${SITE.name} collects, uses and protects your information.`,
};

const PROCESSORS = [
  ["Anthropic", "Generates prayers and companion replies from what you write", "Your messages, prayer requests, quiz answers needed for the reply"],
  ["ElevenLabs", "Turns prayer text into audio", "Prayer text"],
  ["Stripe", "Web payments and subscription management", "Email, payment details (held by Stripe, never by us), subscription status"],
  ["Apple (App Store) and RevenueCat", "In-app purchases and subscription status", "Purchase and subscription records, an app user id"],
  ["PostHog", "Product analytics: which features are used, where people drop off", "Usage events, device and browser data, approximate location from IP. Never your prayers, intentions, notes or chats"],
  ["Resend", "Sending sign-in codes and service emails", "Email address, email content"],
  ["Vercel", "Hosting the website and API", "Request data, logs"],
  ["Database host", "Storing your account and content", "Everything stored in your account"],
  ["Cloudflare R2", "Storing prayer audio files", "Audio files (not linked to you for library prayers)"],
  ["Expo (push notifications)", "Delivering reminders to your phone", "A device push token"],
] as const;

export default function PrivacyPage() {
  return (
    <DocPage
      eyebrow="Legal"
      title="Privacy Policy"
      updated={SITE.legalUpdated}
      toc={[
        ["collect", "What we collect"],
        ["use", "How we use it"],
        ["ai", "AI"],
        ["sharing", "Who we share it with"],
        ["rights", "Your choices and rights"],
        ["children", "Children"],
        ["contact", "Contact"],
      ]}
    >
      <p>
        {SITE.name} (&quot;we&quot;, &quot;us&quot;) is a prayer and Bible app with an AI companion, available on the web and
        on mobile. It is operated by {SITE.operator}, {SITE.operatorAddress}. This policy explains what information we
        collect when you use {SITE.name}, why, who we share it with and the choices you have.
      </p>

      <div className="summary bg-sage motif">
        <b>The short version</b>
        <ul>
          <li>We collect what we need to run the app: your account, your preferences and what you write in it.</li>
          <li>Your prayers, intentions, notes and conversations are private. We never sell them or use them for advertising.</li>
          <li>To answer you, the AI companion sends your messages to our AI provider. They are not used to train AI models.</li>
          <li>You can download or delete your data, or your whole account, at any time.</li>
        </ul>
      </div>

      <h2 id="collect">1. What we collect</h2>
      <h3>Information you give us</h3>
      <ul>
        <li>
          <b>Account details:</b> email address, first name (optional), and an identifier from Apple or Google if you sign in
          with them.
        </li>
        <li>
          <b>Quiz and profile answers:</b> for example your Christian tradition, preferred Bible translation, what you would
          like prayer for (such as worry or grief), how often you pray, and your reminder time.
        </li>
        <li>
          <b>Your content:</b> prayers you save, prayer intentions, journal notes and your conversations with the companion.
        </li>
        <li>
          <b>Support messages</b> you send us.
        </li>
      </ul>
      <h3>Information collected automatically</h3>
      <ul>
        <li>
          <b>Usage data:</b> pages and screens viewed, features used (for example &quot;prayer marked as done&quot;), quiz
          steps completed, and how you arrived (such as a link or ad campaign).
        </li>
        <li>
          <b>Device data:</b> device and browser type, operating system, language, time zone, and IP address (used to
          estimate country or region).
        </li>
        <li>
          <b>Cookies and similar technologies:</b> to keep you signed in, remember your quiz progress and measure how the
          site is used. See <a href="#cookies">Cookies</a> below.
        </li>
        <li>
          <b>Push token:</b> if you allow reminders on your phone.
        </li>
      </ul>
      <h3>Information from others</h3>
      <ul>
        <li>
          <b>Payment providers</b> (Stripe, Apple, RevenueCat) tell us whether your subscription is active, its plan and
          renewal dates. We never receive or store your full card number.
        </li>
        <li>
          <b>Apple or Google</b> share your email (or an Apple relay address) and name when you choose to sign in with them.
        </li>
      </ul>

      <div className="callout bg-butter">
        <b>About sensitive information.</b> Your faith and what you ask prayer for can reveal religious beliefs and details
        about your health or emotional wellbeing. Several laws treat this as sensitive information. We ask for your consent
        before storing it, use it only to provide {SITE.name} to you, keep it out of analytics and advertising tools, and
        you can withdraw consent by deleting the information or your account.
      </div>

      <h2 id="use">2. How we use information</h2>
      <ul>
        <li>To provide {SITE.name}: create your account, write and show your daily prayer, run the companion, save your journal, sync between web and phone.</li>
        <li>To personalise: match prayers and Scripture to your tradition, translation and what you asked prayer for.</li>
        <li>To keep people safe: automatically check companion messages for crisis signs and show emergency resources, and prevent abuse of the service.</li>
        <li>To handle subscriptions: free trials, renewals, cancellations and refunds.</li>
        <li>To communicate: sign-in codes, receipts, trial-ending reminders, service updates, and, if you choose, prayer reminders.</li>
        <li>To improve {SITE.name}: understand which features help, fix bugs, and measure our marketing. We use usage data for this, not the content of your prayers or conversations.</li>
        <li>To comply with law and protect our rights.</li>
      </ul>
      <p>
        If you are in the European Economic Area or the UK, we rely on these legal bases: performing our contract with you
        (running the service), your consent (sensitive information, optional cookies, reminders), our legitimate interests
        (security, improving the service, measuring marketing, which we balance against your rights) and legal obligations.
      </p>

      <h2 id="ai">3. The AI companion</h2>
      <p>
        When you write to the companion or ask for a prayer, the relevant text (and the preferences needed to answer, such as
        your tradition and translation) is sent to our AI provider, Anthropic, to generate the reply. Under its commercial
        terms, Anthropic does not use this data to train its models. Bible verses shown in replies are loaded from our own
        Bible database, not written by the AI.
      </p>
      <p>
        AI replies can be wrong. They are not pastoral, medical, legal or professional advice. You can turn the companion off
        in Settings and keep using the Bible, prayers and journal. Conversations are stored encrypted so you can read them
        later, and you can delete them at any time.
      </p>

      <h2 id="sharing">4. Who we share information with</h2>
      <p>
        We do not sell your personal information. We share it only with service providers that process it for us under
        contract, to run {SITE.name}:
      </p>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Provider</th>
              <th>Purpose</th>
              <th>Information involved</th>
            </tr>
          </thead>
          <tbody>
            {PROCESSORS.map(([name, purpose, data]) => (
              <tr key={name}>
                <td>
                  <b>{name}</b>
                </td>
                <td>{purpose}</td>
                <td>{data}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p>
        <b>Advertising.</b> If we run ads, our website may use advertising pixels (such as Meta or TikTok) that learn only
        that someone visited the site, signed up or started a subscription, so we can measure campaigns. They never receive
        your quiz answers, prayers, intentions, notes or conversations, and the mobile app does not track you across other
        companies&apos; apps. Some US state laws may call this &quot;sharing&quot;; you can opt out at any time by contacting
        us.
      </p>
      <p>
        We may also disclose information if required by law, to protect someone&apos;s safety, or as part of a merger or sale
        of the service (in which case this policy continues to apply to your information).
      </p>

      <h2 id="cookies">5. Cookies</h2>
      <p>
        We use necessary cookies to keep you signed in and to remember your quiz progress, and analytics cookies (PostHog) to
        understand how the site is used. Analytics never record what you type, and session recordings, if used, hide all text
        on the page. Where the law requires it, we ask before setting non-essential cookies. You can also block cookies in your
        browser settings.
      </p>

      <h2 id="retention">6. How long we keep information</h2>
      <ul>
        <li>Your account and content: for as long as your account is open.</li>
        <li>After you delete your account: removed within 30 days, and from backups within a further 30 days.</li>
        <li>Payment and tax records: as long as the law requires (often up to 7 years).</li>
        <li>Unfinished quiz sessions without an account: deleted after 90 days.</li>
        <li>Analytics data: up to 2 years, then deleted or anonymised.</li>
      </ul>

      <h2 id="rights">7. Your choices and rights</h2>
      <ul>
        <li>
          <b>Access and export:</b> download your data from Settings, or ask us.
        </li>
        <li>
          <b>Correct:</b> edit your profile in Settings.
        </li>
        <li>
          <b>Delete:</b> delete individual items, or your whole account in Settings or on our{" "}
          <Link href="/delete-account">delete account page</Link>.
        </li>
        <li>
          <b>Withdraw consent and turn things off:</b> the AI companion, reminders and marketing emails can each be turned off.
        </li>
        <li>
          <b>Object or restrict:</b> ask us to stop certain processing, such as analytics.
        </li>
      </ul>
      <p>
        Depending on where you live (for example the EEA, UK, California and other US states) you have rights to access,
        correct, delete and port your information, to object to or restrict processing, to opt out of the sale or sharing of
        personal information and of targeted advertising, and to limit the use of sensitive information. We honour these
        requests for all users. We will not treat you differently for using them. To make a request, email{" "}
        <a href={`mailto:${SITE.privacyEmail}`}>{SITE.privacyEmail}</a> from the address on your account; we may need to
        verify your identity. You may also complain to your local data protection authority.
      </p>

      <h2 id="security">8. Security</h2>
      <p>
        We protect information with encryption in transit (HTTPS), encryption of conversations at rest, access controls and
        limited staff access. No system is perfectly secure; if a breach affects you, we will tell you as the law requires.
      </p>

      <h2 id="transfers">9. International transfers</h2>
      <p>
        We and our providers are mainly based in the United States, so your information may be processed there. Where the law
        requires, we use safeguards such as the European Commission&apos;s Standard Contractual Clauses.
      </p>

      <h2 id="children">10. Children</h2>
      <p>
        {SITE.name} is not for children under {SITE.minAge} (or the higher minimum age in your country). We do not knowingly
        collect information from them. If you believe a child has given us information, contact us and we will delete it.
      </p>

      <h2 id="crisis">11. If you are in crisis</h2>
      <p>
        {SITE.name} is not an emergency service. If you are thinking about harming yourself, call or text <b>988</b> (Suicide
        &amp; Crisis Lifeline, US) or call <b>911</b>. Outside the US, contact your local emergency number.
      </p>

      <h2 id="changes">12. Changes to this policy</h2>
      <p>
        We will post any changes here and update the date above. If a change is significant, we will tell you by email or in
        the app before it takes effect.
      </p>

      <h2 id="contact">13. Contact</h2>
      <p>
        {SITE.operator}, {SITE.operatorAddress}. Email: <a href={`mailto:${SITE.privacyEmail}`}>{SITE.privacyEmail}</a>.
      </p>
    </DocPage>
  );
}
