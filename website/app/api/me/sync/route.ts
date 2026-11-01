import type { NextRequest } from "next/server";
import { handle, readJson } from "@/lib/api";
import { requireUser } from "@/lib/auth/session";
import { applyOps, getUserLibrary, syncBodySchema } from "@/lib/userLibrary";

// The app user's own library: favorites, recently prayed, intentions & reflections, Bible highlights / notes /
// bookmarks (lib/userLibrary.ts).

// GET /api/me/sync → { favorites, recent, journal, marks, bookmarks }
export const GET = handle(async (req: NextRequest) => {
  const session = await requireUser(req);
  return Response.json(await getUserLibrary(session.id), { headers: { "Cache-Control": "private, no-store" } });
});

// POST /api/me/sync { ops: [...] } → the library after applying them. Idempotent, so the app can resend a batch.
export const POST = handle(async (req: NextRequest) => {
  const session = await requireUser(req);
  const { ops } = syncBodySchema.parse(await readJson(req));
  await applyOps(session.id, ops);
  return Response.json(await getUserLibrary(session.id), { headers: { "Cache-Control": "private, no-store" } });
});
