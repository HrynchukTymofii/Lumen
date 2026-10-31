import type { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { handle } from "@/lib/api";
import { getContentVersion } from "@/lib/content";
import { r2Configured } from "@/lib/r2";
import { ttsConfigured } from "@/lib/tts";

// Who is signed in and which services are set up (the editor hides buttons that can't work yet).
export const GET = handle(async (req: NextRequest) => {
  const admin = await requireAdmin(req);
  return Response.json({
    email: admin.email,
    contentVersion: await getContentVersion(),
    services: { r2: r2Configured(), tts: ttsConfigured() },
  });
});
