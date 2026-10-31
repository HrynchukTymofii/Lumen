import type { NextRequest } from "next/server";
import { z } from "zod";
import { handle, readJson } from "@/lib/api";
import { getSessionFromRequest } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

// Long strings are cut instead of rejected, so a huge stack trace still gets reported
const clipped = (max: number) =>
  z
    .string()
    .transform((s) => s.slice(0, max))
    .nullish();

const body = z.object({
  type: z.enum(["crash", "error"]).catch("error"),
  message: z.string().min(1).transform((s) => s.slice(0, 2000)),
  stack: clipped(8000),
  isFatal: z.boolean().nullish(),
  page: clipped(300),
  platform: z.enum(["ios", "android", "web"]),
  osVersion: clipped(50),
  deviceModel: clipped(100),
  appVersion: clipped(50),
});

// Crash and error reports from the phone app (copied from PDR_pl). Sign-in is optional,
// so signed-out installs and users with an expired token can report too.
export const POST = handle(async (req: NextRequest) => {
  const session = await getSessionFromRequest(req);
  const data = { ...body.parse(await readJson(req)), userId: session?.id ?? null };

  try {
    await prisma.appError.create({ data });
  } catch {
    // The token belongs to an account deleted since: keep the report without it
    await prisma.appError.create({ data: { ...data, userId: null } });
  }
  return Response.json({ ok: true });
});
