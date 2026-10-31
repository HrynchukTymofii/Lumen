import { connection } from "next/server";
import { getContentVersion } from "@/lib/content";
import { handle } from "@/lib/api";

// Cheap check the app makes on launch and when it comes back to the foreground.
export const GET = handle(async () => {
  await connection(); // always read the live value, never a build-time snapshot
  return Response.json({ version: await getContentVersion() }, { headers: { "Cache-Control": "no-store" } });
});
