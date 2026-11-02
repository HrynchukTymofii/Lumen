import type { NextRequest } from "next/server";
import { z } from "zod";
import { HttpError } from "@/lib/admin-auth";
import { handle, readJson } from "@/lib/api";
import { getSessionFromRequest } from "@/lib/auth/session";
import { normalizeEmail } from "@/lib/auth/users";
import { sendSupportRequest } from "@/lib/email";
import { prisma } from "@/lib/prisma";
import { SUPPORT_MESSAGE_MAX, SUPPORT_TOPICS, type SupportTopic } from "@/lib/support";

const body = z.object({
  email: z.string().trim().email("Please enter a valid email").max(200),
  name: z.string().trim().max(100).optional(),
  topic: z.enum(Object.keys(SUPPORT_TOPICS) as [SupportTopic, ...SupportTopic[]]),
  message: z.string().trim().min(10, "Please tell us a little more").max(SUPPORT_MESSAGE_MAX),
  platform: z.enum(["ios", "android", "web"]),
  appVersion: z.string().max(50).nullish(),
  website: z.string().optional(), // honeypot: hidden on the web form, only bots fill it in
});

const PER_HOUR = 5;

// POST /api/support: the Contact & Support form (website /support and the app's Settings).
// Sign-in is optional. The message is saved, then emailed to SITE.contactEmail with Reply-To set to the sender.
export const POST = handle(async (req: NextRequest) => {
  const session = await getSessionFromRequest(req);
  const parsed = body.safeParse(await readJson(req));
  if (!parsed.success) throw new HttpError(400, parsed.error.issues[0]?.message ?? "Please check the form");
  const { website, name, appVersion, ...input } = parsed.data;
  if (website) return Response.json({ ok: true }); // a bot: pretend it worked

  const email = normalizeEmail(input.email);
  const recent = await prisma.supportRequest.count({
    where: { email, createdAt: { gt: new Date(Date.now() - 60 * 60 * 1000) } },
  });
  if (recent >= PER_HOUR) throw new HttpError(429, "You've sent a few messages already. We'll get back to you soon.");

  const request = await prisma.supportRequest.create({
    data: { ...input, email, name: name || null, appVersion: appVersion ?? null, userId: session?.id ?? null },
  });

  try {
    await sendSupportRequest({ ...request, topic: input.topic });
    await prisma.supportRequest.update({ where: { id: request.id }, data: { emailedAt: new Date() } });
  } catch (err) {
    // The row is kept, so the message isn't lost; emailedAt stays empty for anyone looking later
    console.error("[support email]", err);
  }
  return Response.json({ ok: true });
});
