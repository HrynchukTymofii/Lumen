import type { NextRequest } from "next/server";
import { z } from "zod";
import { HttpError, requireAdmin } from "@/lib/admin-auth";
import { handle, readJson } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { audioKey, presignAudioUpload } from "@/lib/r2";

const body = z.object({
  trackId: z.string().uuid(),
  minutes: z.union([z.literal(1), z.literal(3), z.literal(5)]),
  contentType: z.enum(["audio/mpeg", "audio/mp3"]),
});

// Step 1 of a manual upload: a 10-minute presigned PUT URL for a recorded MP3.
// The editor then PUTs the file to R2 and saves { url, durationSec } on the variant with PATCH /tracks/:id.
export const POST = handle(async (req: NextRequest) => {
  await requireAdmin(req);
  const input = body.parse(await readJson(req));
  const track = await prisma.audioTrack.findUniqueOrThrow({ where: { id: input.trackId } });
  if (track.status === "published") throw new HttpError(409, "Unpublish it first");

  const key = audioKey(track.slug, input.minutes, `${track.id}-${input.minutes}`);
  return Response.json(await presignAudioUpload(key, "audio/mpeg"));
});
