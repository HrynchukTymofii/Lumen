import type { NextRequest } from "next/server";
import { z } from "zod";
import { HttpError } from "@/lib/admin-auth";
import { handle, readJson } from "@/lib/api";
import { companionUser, rateLimited } from "@/lib/ai/user";
import { trackAfter } from "@/lib/analytics/server";
import { decrypt } from "@/lib/crypto";
import { prisma } from "@/lib/prisma";
import { deletePrivate, privateAudioConfigured, putPrivateAudio } from "@/lib/r2";
import { refundTokens, spendTokens, undoMonthlyFree, useMonthlyFree } from "@/lib/tokens";
import { speakLines, ttsConfigured } from "@/lib/tts";
import { DEFAULT_VOICE, VOICE_IDS, VOICES } from "@/lib/voices";
import {
  audioPrice,
  freeAudioLeft,
  localMonth,
  monthlyFreeId,
  ownPrayer,
  paragraphsOf,
  prayerDetail,
  textHash,
} from "@/lib/prayers/personal";

export const maxDuration = 60;

// ElevenLabs API price for Multilingual v2: $0.08 per 1,000 characters = 80 micro-dollars per character
const TTS_MICRO_USD_PER_CHAR = 80;

const body = z.object({ expectedTokens: z.number().int().min(0).max(20), voice: z.enum(VOICE_IDS).default(DEFAULT_VOICE) });

// POST /api/prayers/personal/:id/audio { expectedTokens, voice? } → the prayer with its new audio, read in that voice.
// Price: 1 token per 200 words (Premium's first prayer of the month up to 200 words is free). Tokens are taken
// only for a recording that succeeds. 409 price_changed (the text changed since the price was shown),
// 402 no_tokens / paywall, 422 too_long, 503 when ElevenLabs or the private bucket isn't configured.
export const POST = handle(async (req: NextRequest, ctx: RouteContext<"/api/prayers/personal/[id]/audio">) => {
  const { user, premium } = await companionUser(req);
  const prayer = await ownPrayer(user.id, (await ctx.params).id);
  const { expectedTokens, voice } = body.parse(await readJson(req));
  if (rateLimited(`audio:${prayer.id}`, 3)) throw new HttpError(429, "This prayer is already being recorded.");

  const text = decrypt(prayer.text);
  const hash = textHash(text);
  const freeLeft = await freeAudioLeft(user, premium);
  // Already recorded as it reads now, in this voice: nothing to buy
  if (prayer.audioKey && prayer.audioTextHash === hash && (prayer.voice ?? DEFAULT_VOICE) === voice) return Response.json(await prayerDetail(prayer, freeLeft));

  const price = audioPrice(text, prayer.words, freeLeft);
  if (price.tooLong) throw new HttpError(422, "Audio prayers can be up to 1,600 words.", { code: "too_long" });
  if (price.tokens !== expectedTokens) {
    throw new HttpError(409, "The price changed. Please check it and try again.", { code: "price_changed", audioPrice: price });
  }
  if (!ttsConfigured() || !privateAudioConfigured()) throw new HttpError(503, "Audio prayers aren't available right now.");

  // Charge first, so two requests can't both spend the same tokens; give it back if the recording fails
  const month = localMonth(user.timezone);
  const freeId = monthlyFreeId(user.id, month);
  if (price.free) {
    if (!(await useMonthlyFree(user.id, month, freeId, prayer.id))) {
      throw new HttpError(409, "Your free audio prayer this month is already used.", {
        code: "price_changed",
        audioPrice: audioPrice(text, prayer.words, false),
      });
    }
  } else if (!(await spendTokens(user.id, price.tokens, prayer.id))) {
    throw premium || user.prayerTokens > 0
      ? new HttpError(402, "You don't have enough prayer tokens.", { code: "no_tokens", tokens: user.prayerTokens, needed: price.tokens })
      : new HttpError(402, "Audio prayers come with Premium.", { code: "paywall" });
  }

  let recorded;
  try {
    const voiced = await speakLines(paragraphsOf(text).map((line) => ({ text: line, t: null })), VOICES[voice].elevenLabsId);
    const key = `prayers/${user.id}/${prayer.id}-${hash}-${voice}.mp3`;
    await putPrivateAudio(key, voiced.audio);
    recorded = await prisma.personalPrayer.update({
      where: { id: prayer.id },
      data: { audioKey: key, audioTextHash: hash, voice, lines: voiced.lines, durationSec: voiced.durationSec },
    });
    if (prayer.audioKey && prayer.audioKey !== key) await deletePrivate(prayer.audioKey);
  } catch (err) {
    if (price.free) await undoMonthlyFree(freeId);
    else await refundTokens(user.id, price.tokens, prayer.id);
    console.error("[prayer audio]", err instanceof Error ? err.message : err);
    throw new HttpError(502, "We couldn't record this prayer. Your tokens weren't used. Please try again.");
  }

  await prisma.aiUsage
    .create({ data: { userId: user.id, kind: "tts", model: "eleven_multilingual_v2", costMicroUsd: text.length * TTS_MICRO_USD_PER_CHAR } })
    .catch((err) => console.error("[prayer audio] usage not recorded", err));
  trackAfter(user.id, "personal_prayer_listened", { tokens: price.tokens, free: price.free, words: prayer.words, voice });
  return Response.json(await prayerDetail(recorded, price.free ? false : freeLeft));
});
