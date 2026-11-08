import type { NextRequest } from "next/server";
import { HttpError, requireAdmin } from "@/lib/admin-auth";
import { handle } from "@/lib/api";
import type { Variant } from "@/lib/content";
import { prisma } from "@/lib/prisma";
import { audioKey, putAudio, r2Configured } from "@/lib/r2";
import { speakLines, ttsConfigured } from "@/lib/tts";
import { VOICES } from "@/lib/voices";

export const maxDuration = 60;

// POST /api/admin/tracks/funnel-prayer → { track }: the first prayer for the web funnel and the app's onboarding.
// One standard Protestant prayer for anyone carrying something heavy, read by John, saved as a draft in the
// "funnel" category with no tags (so it fits every answer). Read it, mark it reviewed and publish it in the editor.
// If it's already there, that one comes back unchanged.

const SLUG = "funnel-protestant-prayer";
const VOICE = "john";

// Scripture is quoted from the World English Bible (public domain)
const LINES = [
  "Heavenly Father, I come to you just as I am.",
  "You know what I'm carrying today, even the parts I can't put into words. I don't have to pretend with you.",
  "Jesus, you said, “Come to me, all you who labor and are heavily burdened, and I will give you rest.” So I come. I lay this weight down at your feet.",
  "Quiet my anxious thoughts. Where I feel alone, remind me that you are near. Where I feel weak, be my strength.",
  "I don't need to have it all figured out today. Help me trust you, one step at a time.",
  "Let your peace, which surpasses all understanding, guard my heart and my mind in Christ Jesus.",
  "Thank you for hearing me. Thank you that I am never alone.",
  "In Jesus' name, Amen.",
];

export const POST = handle(async (req: NextRequest) => {
  await requireAdmin(req);
  const existing = await prisma.audioTrack.findUnique({ where: { slug: SLUG } });
  if (existing) return Response.json({ track: existing, existed: true });
  if (!ttsConfigured() || !r2Configured()) throw new HttpError(503, "ElevenLabs and R2 have to be set up first.");

  const spoken = await speakLines(
    LINES.map((text) => ({ text, t: null })),
    VOICES[VOICE].elevenLabsId,
  );
  const url = await putAudio(audioKey(SLUG, 1, spoken.audio), spoken.audio);
  const variant: Variant = { minutes: 1, url, durationSec: spoken.durationSec, lines: spoken.lines };

  const track = await prisma.audioTrack.create({
    data: {
      slug: SLUG,
      title: "When It Feels Heavy",
      subtitle: "A prayer to lay your burden down",
      category: "funnel",
      tags: [],
      scene: "dawn",
      scriptureRefs: ["Matt.11.28", "Phil.4.7"],
      variants: [variant],
      isPremium: false,
      source: "human",
      status: "draft",
    },
  });
  return Response.json({ track, existed: false }, { status: 201 });
});
