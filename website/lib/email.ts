import { Resend } from "resend";
import { SITE } from "@/lib/site";
import { SUPPORT_TOPICS, type SupportTopic } from "@/lib/support";

async function send(to: string, subject: string, text: string, replyTo?: string) {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    // Local development without email: the message shows up in the `npm run dev` terminal
    console.log(`\n[email to ${to}${replyTo ? `, reply to ${replyTo}` : ""}] ${subject}\n${text}\n`);
    return;
  }
  const { error } = await new Resend(key).emails.send({
    from: process.env.EMAIL_FROM ?? `${SITE.name} <hello@example.com>`,
    to,
    subject,
    text,
    replyTo,
  });
  if (error) throw new Error(`Resend: ${error.message}`);
}

export function sendAdminCode(email: string, code: string) {
  return send(
    email,
    `Your ${SITE.name} admin code: ${code}`,
    `Your code is ${code}. It works for 15 minutes.\n\nIf you didn't try to sign in, you can ignore this email.`,
  );
}

export function sendLoginEmail(email: string, code: string, link: string) {
  return send(
    email,
    `Your ${SITE.name} code: ${code}`,
    `Your sign-in code is ${code}. It works for 15 minutes.\n\nOr open this link to sign in (works for 24 hours, once):\n${link}\n\nIf you didn't try to sign in, you can ignore this email.`,
  );
}

export function sendWelcomeEmail(email: string, firstName: string | null, link: string) {
  return send(
    email,
    `Welcome to ${SITE.name}`,
    `${firstName ? `Hi ${firstName},` : "Hi,"}\n\nYour 7-day prayer path is ready. Open it here (this link signs you in, works once, for 24 hours):\n${link}\n\nYou can always sign in again at ${SITE.url}/app/login with this email.\n\nThe Bible, the verse of the day and a daily prayer are free forever.\n\n— ${SITE.name}`,
  );
}

export type SupportMessage = {
  id: string;
  email: string;
  name: string | null;
  topic: SupportTopic;
  message: string;
  platform: string;
  appVersion: string | null;
  userId: string | null;
};

// A Contact & Support form message, to the support inbox. Reply answers the person directly (Reply-To).
export function sendSupportRequest(m: SupportMessage) {
  const preview = m.message.replace(/\s+/g, " ").slice(0, 60);
  return send(
    SITE.contactEmail,
    `[Support] ${SUPPORT_TOPICS[m.topic]}: ${preview}`,
    [
      m.message,
      "",
      "—",
      `From: ${m.name ? `${m.name} <${m.email}>` : m.email}`,
      `Topic: ${SUPPORT_TOPICS[m.topic]}`,
      `Platform: ${m.platform}${m.appVersion ? ` (app ${m.appVersion})` : ""}`,
      `Account: ${m.userId ?? "not signed in"}`,
      `Request ID: ${m.id}`,
    ].join("\n"),
    m.email,
  );
}
