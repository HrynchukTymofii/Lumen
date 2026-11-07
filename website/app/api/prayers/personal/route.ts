import type { NextRequest } from "next/server";
import { z } from "zod";
import { HttpError } from "@/lib/admin-auth";
import { handle, readJson } from "@/lib/api";
import { classify } from "@/lib/ai/classify";
import { CRISIS_RESOURCES } from "@/lib/ai/prompts/companion";
import { trackAfter } from "@/lib/analytics/server";
import { companionUser, rateLimited } from "@/lib/ai/user";
import { encrypt } from "@/lib/crypto";
import { prisma } from "@/lib/prisma";
import {
  LENGTHS,
  countGenerated,
  countWords,
  freeAudioLeft,
  generatorQuota,
  prayerDetail,
  prayerSummary,
  writePrayer,
} from "@/lib/prayers/personal";

export const maxDuration = 60;

// GET /api/prayers/personal → { prayers: [{ id, source, title, words, hasAudio, createdAt, updatedAt }] }, newest first
export const GET = handle(async (req: NextRequest) => {
  const { user } = await companionUser(req);
  const rows = await prisma.personalPrayer.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 200 });
  return Response.json({ prayers: rows.map(prayerSummary) });
});

const body = z.object({
  need: z.string().trim().min(10, "Tell us a little more (at least a few words).").max(600),
  length: z.enum(Object.keys(LENGTHS) as [keyof typeof LENGTHS, ...(keyof typeof LENGTHS)[]]).default("short"),
});

const MESSAGES = {
  off_topic: "This space is for prayer. Tell us what's on your heart, and we'll write a prayer for it.",
  jailbreak: "We can only write a prayer from what you're carrying. Tell us what's on your heart.",
  abuse: "We can't write a prayer from this. Tell us what's on your heart, and we'll pray with you.",
} as const;

// POST /api/prayers/personal { need, length } → the new prayer (as GET /:id), or { crisis: true, resources }.
// 429 limit (free 5 a month, Premium 10 a day), 422 for messages that aren't a prayer request.
export const POST = handle(async (req: NextRequest) => {
  const { user, premium } = await companionUser(req);
  const input = body.parse(await readJson(req));
  const tier = premium ? "premium" : "free";
  if (rateLimited(`prayer:${user.id}`, 5)) throw new HttpError(429, "One moment, please. Try again in a minute.");

  const quota = await generatorQuota(user, premium);
  if (quota.used >= quota.limit) {
    trackAfter(user.id, "personal_prayer_limit_reached", { tier, limit: quota.limit });
    const when = premium ? "tomorrow" : `on ${new Date(`${quota.resetsOn}T12:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" })}`;
    throw new HttpError(429, `You've written ${quota.limit} prayers this ${quota.per}. You can write more ${when}.`, { code: "limit", quota, premium });
  }

  const { category, topics } = await classify(input.need, user.id);
  if (category === "crisis") {
    trackAfter(user.id, "personal_prayer_blocked", { category });
    return Response.json({ crisis: true, resources: CRISIS_RESOURCES });
  }
  if (category !== "on_topic") {
    trackAfter(user.id, "personal_prayer_blocked", { category });
    throw new HttpError(422, MESSAGES[category], { code: category });
  }

  const written = await writePrayer({ user, need: input.need, length: input.length, topics });
  const prayer = await prisma.personalPrayer.create({
    data: {
      userId: user.id,
      source: "generator",
      need: encrypt(input.need),
      title: encrypt(written.title),
      text: encrypt(written.text),
      refs: written.refs,
      words: countWords(written.text),
    },
  });
  await countGenerated(user.id, quota.period);
  trackAfter(user.id, "personal_prayer_generated", { length: input.length, tier });
  return Response.json(await prayerDetail(prayer, await freeAudioLeft(user, premium)), { status: 201 });
});
