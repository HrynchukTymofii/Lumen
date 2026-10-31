import type { NextRequest } from "next/server";
import { z } from "zod";
import { HttpError, requireAdmin } from "@/lib/admin-auth";
import { handle, readJson } from "@/lib/api";
import { LENGTHS, readVariants } from "@/lib/content";
import { prisma } from "@/lib/prisma";
import { audioKey, putAudio } from "@/lib/r2";
import { speakLines } from "@/lib/tts";

const body = z.object({ minutes: z.union([z.literal(LENGTHS[0]), z.literal(LENGTHS[1]), z.literal(LENGTHS[2])]) });

// Generates the voice for one length: ElevenLabs → R2 → url, duration and line timings saved on the track.
export const POST = handle(async (req: NextRequest, ctx: RouteContext<"/api/admin/tracks/[id]/tts">) => {
  await requireAdmin(req);
  const { id } = await ctx.params;
  const { minutes } = body.parse(await readJson(req));
  const track = await prisma.audioTrack.findUniqueOrThrow({ where: { id } });
  if (track.status === "published") throw new HttpError(409, "Unpublish it first");

  const variants = readVariants(track);
  const variant = variants.find((v) => v.minutes === minutes);
  if (!variant) throw new HttpError(404, `No ${minutes}-min version to voice`);

  const spoken = await speakLines(variant.lines);
  const url = await putAudio(audioKey(track.slug, minutes, spoken.audio), spoken.audio);

  const updated = await prisma.audioTrack.update({
    where: { id },
    data: {
      variants: variants.map((v) =>
        v.minutes === minutes ? { ...v, url, durationSec: spoken.durationSec, lines: spoken.lines } : v,
      ),
    },
  });
  return Response.json({ track: updated });
});
