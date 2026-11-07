import type { NextRequest } from "next/server";
import { z } from "zod";
import { HttpError } from "@/lib/admin-auth";
import { handle, readJson } from "@/lib/api";
import { companionUser } from "@/lib/ai/user";
import { trackAfter } from "@/lib/analytics/server";
import { decrypt, encrypt } from "@/lib/crypto";
import { Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { countWords, freeAudioLeft, prayerDetail } from "@/lib/prayers/personal";

const body = z.object({ messageId: z.string().uuid() });

// POST /api/prayers/personal/from-message { messageId } → the saved prayer (201, or 200 when it was saved before).
// Copies the prayer the companion wrote in that answer; the client never sends prayer text. Not counted in any quota.
export const POST = handle(async (req: NextRequest) => {
  const { user, premium } = await companionUser(req);
  const { messageId } = body.parse(await readJson(req));

  const message = await prisma.message.findFirst({
    where: { id: messageId, role: "assistant", conversation: { userId: user.id } },
    select: { id: true, prayer: true },
  });
  if (!message?.prayer) throw new HttpError(404, "There's no prayer in this message.");

  const existing = await prisma.personalPrayer.findUnique({ where: { messageId } });
  if (existing && existing.userId === user.id) return Response.json(await prayerDetail(existing, await freeAudioLeft(user, premium)));

  const { title, text } = JSON.parse(decrypt(message.prayer)) as { title: string; text: string };
  try {
    const prayer = await prisma.personalPrayer.create({
      data: { userId: user.id, source: "companion", messageId, title: encrypt(title), text: encrypt(text), words: countWords(text) },
    });
    trackAfter(user.id, "personal_prayer_saved", { source: "companion" });
    return Response.json(await prayerDetail(prayer, await freeAudioLeft(user, premium)), { status: 201 });
  } catch (err) {
    // Two taps at once: the other one saved it
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      const saved = await prisma.personalPrayer.findUniqueOrThrow({ where: { messageId } });
      return Response.json(await prayerDetail(saved, await freeAudioLeft(user, premium)));
    }
    throw err;
  }
});
