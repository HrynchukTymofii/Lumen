import { z } from "zod";
import { prisma } from "@/lib/prisma";
import type { AudioTrack, PrayerPath, PrayerPathDay } from "@/lib/generated/prisma/client";

// Scenes are drawn by the app (code), so only these keys render; anything else falls back to "dawn".
export const SCENES = ["dawn", "golden", "lake", "meadow", "dusk", "evening", "night", "sky"] as const;
export const CATEGORIES = ["morning", "evening", "peace", "psalms", "grief", "family", "sleep"] as const;
export const LENGTHS = [1, 3, 5] as const;

export const lineSchema = z.object({
  t: z.number().min(0).nullable(), // seconds from start; null until audio exists
  text: z.string().min(1).max(400),
});

export const variantSchema = z.object({
  minutes: z.union([z.literal(1), z.literal(3), z.literal(5)]),
  url: z.string().url().nullable(),
  durationSec: z.number().int().min(0).nullable(),
  lines: z.array(lineSchema).min(1).max(120),
});

export type Variant = z.infer<typeof variantSchema>;
export const variantsSchema = z.array(variantSchema).max(3);

const slug = z
  .string()
  .min(3)
  .max(80)
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "lowercase words joined by dashes");

// Field rules without defaults: Zod applies .default() even inside .partial(), which would make
// a PATCH that omits a field reset it. Defaults are added only for create.
const trackFields = z.object({
  slug,
  title: z.string().min(2).max(80),
  subtitle: z.string().max(140).nullable(),
  category: z.enum(CATEGORIES),
  tags: z.array(z.string().min(1).max(30)).max(10),
  scene: z.enum(SCENES),
  scriptureRefs: z.array(z.string().min(3).max(40)).max(8),
  variants: variantsSchema,
  isPremium: z.boolean(),
  publishAt: z.coerce.date().nullable(),
  order: z.number().int(),
  source: z.enum(["ai", "human"]),
});

export const trackInputSchema = trackFields.extend({
  subtitle: trackFields.shape.subtitle.optional(),
  tags: trackFields.shape.tags.default([]),
  scene: trackFields.shape.scene.default("dawn"),
  scriptureRefs: trackFields.shape.scriptureRefs.default([]),
  variants: trackFields.shape.variants.default([]),
  isPremium: trackFields.shape.isPremium.default(true),
  publishAt: trackFields.shape.publishAt.optional(),
  order: trackFields.shape.order.default(0),
  source: trackFields.shape.source.default("human"),
});

export const trackPatchSchema = trackFields.partial().extend({
  reviewed: z.boolean().optional(), // true → reviewedBy = current admin, false → cleared
  status: z.enum(["draft", "review"]).optional(), // publishing goes through /publish
});

const pathFields = z.object({
  slug,
  title: z.string().min(2).max(80),
  subtitle: z.string().max(140).nullable(),
  scene: z.enum(SCENES),
  isPremium: z.boolean(),
  order: z.number().int(),
});

export const pathInputSchema = pathFields.extend({
  subtitle: pathFields.shape.subtitle.optional(),
  scene: pathFields.shape.scene.default("dawn"),
  isPremium: pathFields.shape.isPremium.default(true),
  order: pathFields.shape.order.default(0),
});

export const pathPatchSchema = pathFields.partial().extend({
  trackIds: z.array(z.string().uuid()).max(60).optional(), // day 1..n in order
});

export function readVariants(track: Pick<AudioTrack, "variants">): Variant[] {
  const parsed = variantsSchema.safeParse(track.variants);
  return parsed.success ? parsed.data : [];
}

// Why a track can't be published yet; empty array = ready.
export function publishProblems(track: AudioTrack): string[] {
  const problems: string[] = [];
  const variants = readVariants(track);
  if (variants.length === 0) problems.push("Add at least one length (1, 3 or 5 min).");
  for (const v of variants) {
    if (!v.url) problems.push(`The ${v.minutes}-min version has no audio yet.`);
  }
  if (!track.reviewedBy) problems.push("Someone has to read it and press “Mark reviewed”.");
  return problems;
}

export async function bumpContentVersion() {
  return prisma.contentVersion.upsert({
    where: { id: 1 },
    create: { id: 1, version: 1 },
    update: { version: { increment: 1 } },
  });
}

export async function getContentVersion() {
  const row = await prisma.contentVersion.findUnique({ where: { id: 1 } });
  return row?.version ?? 0;
}

// ───────── Public catalog (what the app downloads) ─────────

type PathWithDays = PrayerPath & { days: (PrayerPathDay & { track: AudioTrack })[] };

const isLive = (t: { status: string; publishAt: Date | null }, now: Date) =>
  t.status === "published" && (!t.publishAt || t.publishAt <= now);

export function toPublicTrack(track: AudioTrack, unlocked: boolean) {
  const locked = track.isPremium && !unlocked;
  return {
    id: track.id,
    slug: track.slug,
    title: track.title,
    subtitle: track.subtitle,
    category: track.category,
    tags: track.tags,
    scene: track.scene,
    scriptureRefs: track.scriptureRefs,
    isPremium: track.isPremium,
    locked,
    variants: readVariants(track).map((v) => ({
      minutes: v.minutes,
      durationSec: v.durationSec,
      // Locked items never carry URLs or the full text
      url: locked ? null : v.url,
      lines: locked ? v.lines.slice(0, 2).map((l) => ({ t: null, text: l.text })) : v.lines,
    })),
  };
}

export async function getLibrary(unlocked: boolean) {
  const now = new Date();
  const [tracks, paths, version] = await Promise.all([
    prisma.audioTrack.findMany({
      where: { status: "published", OR: [{ publishAt: null }, { publishAt: { lte: now } }] },
      orderBy: [{ order: "asc" }, { createdAt: "desc" }],
    }),
    prisma.prayerPath.findMany({
      where: { status: "published" },
      orderBy: [{ order: "asc" }, { createdAt: "desc" }],
      include: { days: { orderBy: { day: "asc" }, include: { track: true } } },
    }),
    getContentVersion(),
  ]);

  return {
    version,
    tracks: tracks.map((t) => toPublicTrack(t, unlocked)),
    paths: (paths as PathWithDays[]).map((p) => ({
      id: p.id,
      slug: p.slug,
      title: p.title,
      subtitle: p.subtitle,
      scene: p.scene,
      isPremium: p.isPremium,
      locked: p.isPremium && !unlocked,
      // Only days whose track is live; the app shows them in order
      days: p.days.filter((d) => isLive(d.track, now)).map((d) => ({ day: d.day, trackId: d.trackId })),
    })),
  };
}
