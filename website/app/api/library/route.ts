import type { NextRequest } from "next/server";
import { getContentVersion, getLibrary } from "@/lib/content";
import { handle } from "@/lib/api";
import { getSessionFromRequest } from "@/lib/auth/session";
import { getPremium } from "@/lib/entitlement";

// The app's whole prayer catalog. ETag = content version, so an unchanged catalog costs one tiny 304.
export const GET = handle(async (req: NextRequest) => {
  const session = await getSessionFromRequest(req);
  const unlocked = session ? Boolean(await getPremium(session.id)) : false;
  const etag = `"lib-${await getContentVersion()}-${unlocked ? "p" : "f"}"`;

  if (req.headers.get("if-none-match") === etag) {
    return new Response(null, { status: 304, headers: { ETag: etag } });
  }
  const library = await getLibrary(unlocked);
  return Response.json(library, {
    headers: { ETag: etag, "Cache-Control": "private, no-cache" },
  });
});
