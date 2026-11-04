import { Resend } from "resend";
import { SITE } from "@/lib/site";
import { SUPPORT_TOPICS, type SupportTopic } from "@/lib/support";

// The sender is always shown as the app's current name; EMAIL_FROM only supplies the address, so a stale display
// name in the environment ("Lumen <hello@…>") can't leak into emails.
function sender() {
  const raw = process.env.EMAIL_FROM ?? "hello@example.com";
  const address = /<([^>]+)>/.exec(raw)?.[1] ?? raw.trim();
  return `${SITE.name} <${address}>`;
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

type Block = { text: string } | { code: string } | { button: string; href: string } | { small: string };

// The HTML version: the Light on top, the wordmark, then the message, in the site's colors (white, ink, soft grey).
// Tables and inline styles, because that's what email clients render reliably. The plain-text version is sent too.
export function html(blocks: Block[]) {
  const body = blocks
    .map((b) => {
      if ("code" in b)
        return `<div style="margin:24px 0;padding:18px 0;border-radius:20px;background:#f3f3f5;text-align:center;font-size:34px;font-weight:600;letter-spacing:8px;color:#0e0e10">${esc(b.code)}</div>`;
      if ("button" in b)
        return `<div style="margin:28px 0;text-align:center"><a href="${esc(b.href)}" style="display:inline-block;padding:16px 30px;border-radius:999px;background:#0e0e10;color:#ffffff;font-size:16px;font-weight:600;text-decoration:none">${esc(b.button)}</a></div>`;
      if ("small" in b) return `<p style="margin:16px 0 0;font-size:13px;line-height:20px;color:#8a8a91">${esc(b.small)}</p>`;
      return `<p style="margin:0 0 14px;font-size:16px;line-height:25px;color:#0e0e10">${esc(b.text)}</p>`;
    })
    .join("");
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"></head>
<body style="margin:0;padding:0;background:#ffffff">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif">
<tr><td align="center" style="padding-bottom:4px"><img src="${SITE.url}/email/light.png" width="72" height="72" alt="" style="display:block;border:0"></td></tr>
<tr><td align="center" style="padding-bottom:28px;font-size:24px;font-weight:600;letter-spacing:-0.8px;color:#0e0e10">holy hush</td></tr>
<tr><td style="padding:28px 28px 24px;border-radius:28px;background:#ffffff;border:1px solid #e9e9ec">${body}</td></tr>
<tr><td align="center" style="padding-top:20px;font-size:12px;line-height:18px;color:#8a8a91">${esc(SITE.name)} · a daily prayer, made for you<br><a href="${SITE.url}" style="color:#8a8a91">${esc(SITE.url.replace(/^https?:\/\//, ""))}</a></td></tr>
</table></td></tr></table></body></html>`;
}

async function send(to: string, subject: string, text: string, replyTo?: string, blocks?: Block[]) {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    // Local development without email: the message shows up in the `npm run dev` terminal
    console.log(`\n[email to ${to}${replyTo ? `, reply to ${replyTo}` : ""}] ${subject}\n${text}\n`);
    return;
  }
  const { error } = await new Resend(key).emails.send({
    from: sender(),
    to,
    subject,
    text,
    ...(blocks && { html: html(blocks) }),
    replyTo,
  });
  if (error) throw new Error(`Resend: ${error.message}`);
}

export function sendAdminCode(email: string, code: string) {
  return send(
    email,
    `Your ${SITE.name} admin code: ${code}`,
    `Your code is ${code}. It works for 15 minutes.\n\nIf you didn't try to sign in, you can ignore this email.`,
    undefined,
    [{ text: "Your admin sign-in code:" }, { code }, { small: "It works for 15 minutes. If you didn't try to sign in, you can ignore this email." }],
  );
}

export function sendLoginEmail(email: string, code: string, link: string) {
  return send(
    email,
    `Your ${SITE.name} code: ${code}`,
    `Your sign-in code is ${code}. It works for 15 minutes.\n\nOr open this link to sign in (works for 24 hours, once):\n${link}\n\nIf you didn't try to sign in, you can ignore this email.`,
    undefined,
    [
      { text: "Here's your sign-in code. Type it in the app:" },
      { code },
      { text: "Or sign in with one tap:" },
      { button: "Sign in", href: link },
      { small: "The code works for 15 minutes, the button once within 24 hours. If you didn't try to sign in, you can ignore this email." },
    ],
  );
}

export function sendWelcomeEmail(email: string, firstName: string | null, link: string) {
  return send(
    email,
    `Welcome to ${SITE.name}`,
    `${firstName ? `Hi ${firstName},` : "Hi,"}\n\nYour 7-day prayer path is ready. Open it here (this link signs you in, works once, for 24 hours):\n${link}\n\nYou can always sign in again at ${SITE.url}/app/login with this email.\n\nThe Bible, the verse of the day and a daily prayer are free forever.\n\n— ${SITE.name}`,
    undefined,
    [
      { text: firstName ? `Hi ${firstName},` : "Hi," },
      { text: "Your 7-day prayer path is ready. A short prayer a day, written for what you're carrying." },
      { button: "Open my prayer path", href: link },
      { text: "The Bible, the verse of the day and a daily prayer are free forever." },
      { small: `The button signs you in once within 24 hours. You can always sign in again at ${SITE.url}/app/login with this email.` },
    ],
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
