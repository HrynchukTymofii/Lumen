import type { NextRequest } from "next/server";
import { z } from "zod";
import { handle, readJson } from "@/lib/api";
import { companionUser } from "@/lib/ai/user";
import { trackAfter } from "@/lib/analytics/server";
import { encrypt } from "@/lib/crypto";
import { prisma } from "@/lib/prisma";
import { deletePrivate } from "@/lib/r2";
import { MAX_TEXT_CHARS, countWords, freeAudioLeft, ownPrayer, prayerDetail } from "@/lib/prayers/personal";

type Ctx = RouteContext<"/api/prayers/personal/[id]">;

// GET /api/prayers/personal/:id → { id, title, text, refs, words, audio: { url, lines, durationSec, stale } | null,
//   audioPrice: { tokens, free, tooLong } }. The audio URL is signed for an hour.
export const GET = handle(async (req: NextRequest, ctx: Ctx) => {
  const { user, premium } = await companionUser(req);
  const prayer = await ownPrayer(user.id, (await ctx.params).id);
  return Response.json(await prayerDetail(prayer, await freeAudioLeft(user, premium)));
});

const edit = z
  .object({
    title: z.string().trim().min(1).max(80).optional(),
    text: z.string().trim().min(1, "The prayer can't be empty.").max(MAX_TEXT_CHARS, "That's too long for one prayer.").optional(),
  })
  .refine((v) => v.title !== undefined || v.text !== undefined, "Nothing to change");

// PATCH /api/prayers/personal/:id { title?, text? } → the prayer. The user's own words: no content check.
export const PATCH = handle(async (req: NextRequest, ctx: Ctx) => {
  const { user, premium } = await companionUser(req);
  const prayer = await ownPrayer(user.id, (await ctx.params).id);
  const input = edit.parse(await readJson(req));
  const updated = await prisma.personalPrayer.update({
    where: { id: prayer.id },
    data: {
      ...(input.title !== undefined && { title: encrypt(input.title) }),
      ...(input.text !== undefined && { text: encrypt(input.text), words: countWords(input.text) }),
    },
  });
  if (input.text !== undefined) trackAfter(user.id, "personal_prayer_edited", { words: updated.words });
  return Response.json(await prayerDetail(updated, await freeAudioLeft(user, premium)));
});

// DELETE /api/prayers/personal/:id → 204, with its audio file
export const DELETE = handle(async (req: NextRequest, ctx: Ctx) => {
  const { user } = await companionUser(req);
  const prayer = await ownPrayer(user.id, (await ctx.params).id);
  await prisma.personalPrayer.delete({ where: { id: prayer.id } });
  if (prayer.audioKey) await deletePrivate(prayer.audioKey);
  return new Response(null, { status: 204 });
});
