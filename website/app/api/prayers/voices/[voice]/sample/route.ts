import { createHash } from "node:crypto";
import type { NextRequest } from "next/server";
import { HttpError } from "@/lib/admin-auth";
import { handle } from "@/lib/api";
import { requireUser } from "@/lib/auth/session";
import { publicUrl, putAudio, r2Configured } from "@/lib/r2";
import { speakLines, ttsConfigured } from "@/lib/tts";
import { VOICES, type VoiceId } from "@/lib/voices";

export const maxDuration = 60;

// GET /api/prayers/voices/:voice/sample → { url }: a few seconds of the voice, to try it before recording a prayer.
// Made with ElevenLabs the first time anyone asks, then kept in the public bucket. The key hashes the ElevenLabs
// voice and the text, so changing either makes a new sample.

const SAMPLE = "The Lord bless you and keep you. The Lord make his face shine on you, and give you peace.";

const keyFor = (voice: VoiceId) =>
  `voices/samples/${voice}-${createHash("sha256").update(VOICES[voice].elevenLabsId).update(SAMPLE).digest("hex").slice(0, 10)}.mp3`;

// Samples known to exist, and ones being made right now (two people asking at once make it once)
const ready = new Set<string>();
const making = new Map<string, Promise<void>>();

async function ensureSample(voice: VoiceId) {
  const key = keyFor(voice);
  if (ready.has(key)) return key;
  const head = await fetch(publicUrl(key), { method: "HEAD", cache: "no-store" }).catch(() => null);
  if (head?.ok) {
    ready.add(key);
    return key;
  }
  let job = making.get(key);
  if (!job) {
    job = (async () => {
      const { audio } = await speakLines([{ text: SAMPLE, t: null }], VOICES[voice].elevenLabsId);
      await putAudio(key, audio);
      ready.add(key);
    })().finally(() => making.delete(key));
    making.set(key, job);
  }
  await job;
  return key;
}

export const GET = handle(async (req: NextRequest, ctx: RouteContext<"/api/prayers/voices/[voice]/sample">) => {
  await requireUser(req);
  const { voice } = await ctx.params;
  if (!(voice in VOICES)) throw new HttpError(404, "No such voice");
  if (!ttsConfigured() || !r2Configured()) throw new HttpError(503, "Voice samples aren't available right now.");
  const key = await ensureSample(voice as VoiceId);
  return Response.json({ url: publicUrl(key) });
});
