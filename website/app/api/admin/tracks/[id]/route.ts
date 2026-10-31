import type { NextRequest } from "next/server";
import { HttpError, requireAdmin } from "@/lib/admin-auth";
import { handle, readJson } from "@/lib/api";
import { bumpContentVersion, readVariants, trackPatchSchema, type Variant } from "@/lib/content";
import { prisma } from "@/lib/prisma";

const scriptOf = (v: Variant) => v.lines.map((l) => l.text.trim()).join("\n");

export const GET = handle(async (req: NextRequest, ctx: RouteContext<"/api/admin/tracks/[id]">) => {
  await requireAdmin(req);
  const { id } = await ctx.params;
  const track = await prisma.audioTrack.findUniqueOrThrow({
    where: { id },
    include: { pathDays: { include: { path: { select: { id: true, title: true } } } } },
  });
  return Response.json({ track });
});

export const PATCH = handle(async (req: NextRequest, ctx: RouteContext<"/api/admin/tracks/[id]">) => {
  const admin = await requireAdmin(req);
  const { id } = await ctx.params;
  const { reviewed, variants, ...rest } = trackPatchSchema.parse(await readJson(req));
  const current = await prisma.audioTrack.findUniqueOrThrow({ where: { id } });
  const live = current.status === "published";

  const data: Record<string, unknown> = { ...rest };
  if (live && rest.status) throw new HttpError(409, "Unpublish it first");

  if (variants) {
    const before = new Map(readVariants(current).map((v) => [v.minutes, v]));
    const textChanged = variants.some((v) => {
      const old = before.get(v.minutes);
      return !old || scriptOf(old) !== scriptOf(v);
    }) || variants.length !== before.size;

    if (textChanged && live) {
      throw new HttpError(409, "Unpublish it before changing the text (the audio would no longer match)");
    }
    data.variants = variants.map((v) => {
      const old = before.get(v.minutes);
      // New words need new audio and a new review
      if (old && scriptOf(old) !== scriptOf(v)) {
        return { ...v, url: null, durationSec: null, lines: v.lines.map((l) => ({ ...l, t: null })) };
      }
      return v;
    });
    if (textChanged) data.reviewedBy = null;
  }

  if (reviewed !== undefined && data.reviewedBy === undefined) {
    data.reviewedBy = reviewed ? admin.email : null;
    if (live && !reviewed) throw new HttpError(409, "Unpublish it first");
  }

  const track = await prisma.audioTrack.update({ where: { id }, data });
  if (live) await bumpContentVersion(); // metadata edits on a live track reach the app too
  return Response.json({ track });
});

// Published items are archived, never hard-deleted (apps may have them saved); drafts are removed.
export const DELETE = handle(async (req: NextRequest, ctx: RouteContext<"/api/admin/tracks/[id]">) => {
  await requireAdmin(req);
  const { id } = await ctx.params;
  const track = await prisma.audioTrack.findUniqueOrThrow({ where: { id }, include: { pathDays: true } });

  if (track.status === "published" || track.pathDays.length > 0) {
    await prisma.audioTrack.update({ where: { id }, data: { status: "archived" } });
    if (track.status === "published") await bumpContentVersion();
    return Response.json({ archived: true });
  }
  await prisma.audioTrack.delete({ where: { id } });
  return Response.json({ deleted: true });
});
