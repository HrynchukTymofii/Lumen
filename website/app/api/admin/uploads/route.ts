import type { NextRequest } from "next/server";
import { z } from "zod";
import { HttpError, requireAdmin } from "@/lib/admin-auth";
import { handle, readJson } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { audioKey, imageKey, presignUpload } from "@/lib/r2";

const body = z.union([
  z.object({
    trackId: z.string().uuid(),
    minutes: z.union([z.literal(1), z.literal(3), z.literal(5)]),
    contentType: z.enum(["audio/mpeg", "audio/mp3"]),
  }),
  z.object({
    trackId: z.string().uuid(),
    kind: z.literal("image"),
    contentType: z.enum(["image/jpeg", "image/png", "image/webp"]),
  }),
]);

// Step 1 of a manual upload: a 10-minute presigned PUT URL for a recorded MP3 or a cover picture.
// The editor then PUTs the file to R2 and saves the URL with PATCH /tracks/:id (on a variant, or as imageUrl).
export const POST = handle(async (req: NextRequest) => {
  await requireAdmin(req);
  const input = body.parse(await readJson(req));
  const track = await prisma.audioTrack.findUniqueOrThrow({ where: { id: input.trackId } });

  // A new picture can't put words and audio out of step, so it's allowed on a live prayer
  if ("kind" in input) return Response.json(await presignUpload(imageKey(track.slug, input.contentType), input.contentType));

  if (track.status === "published") throw new HttpError(409, "Unpublish it first");
  const key = audioKey(track.slug, input.minutes, `${track.id}-${input.minutes}`);
  return Response.json(await presignUpload(key, "audio/mpeg"));
});
