import type { NextRequest } from "next/server";
import { handle } from "@/lib/api";
import { readVariants } from "@/lib/content";
import { prisma } from "@/lib/prisma";
import { STRUGGLES } from "@/funnels/options";

// The funnel's first prayer: a recorded prayer from the admin library (category "funnel", tagged with the struggles
// it fits). Several recordings per struggle → one is picked at random, so people hear different ones.
// GET /api/funnel/recording?s=anxiety,grief → { recording } or { recording: null } when none fits yet.
export const GET = handle(async (req: NextRequest) => {
  const known = new Set(STRUGGLES.map((s) => s.value));
  const wanted = (req.nextUrl.searchParams.get("s") ?? "").split(",").filter((s) => known.has(s));
  const now = new Date();
  const rows = await prisma.audioTrack.findMany({
    where: { category: "funnel", status: "published", OR: [{ publishAt: null }, { publishAt: { lte: now } }] },
  });
  const playable = rows
    .map((row) => ({ row, variant: readVariants(row).find((v) => v.url) }))
    .filter((r) => r.variant);

  // The first thing they named wins, then the others, then any funnel recording at all
  const pool = [...wanted.map((s) => playable.filter((r) => r.row.tags.includes(s))), playable].find((p) => p.length);
  if (!pool) return Response.json({ recording: null });
  const { row, variant } = pool[Math.floor(Math.random() * pool.length)];

  return Response.json({
    recording: {
      slug: row.slug,
      title: row.title,
      scene: row.scene,
      imageUrl: row.imageUrl,
      url: variant!.url,
      durationSec: variant!.durationSec,
      lines: variant!.lines,
    },
  });
});
