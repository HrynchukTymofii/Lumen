import type { NextRequest } from "next/server";
import { z } from "zod";
import { hashCode, isAdminEmail, newCode } from "@/lib/admin-auth";
import { handle, readJson } from "@/lib/api";
import { sendAdminCode } from "@/lib/email";
import { prisma } from "@/lib/prisma";

const body = z.object({ email: z.string().email().max(200) });

export const POST = handle(async (req: NextRequest) => {
  const email = body.parse(await readJson(req)).email.trim().toLowerCase();

  // Same answer for every email, so the form doesn't reveal who is an admin
  if (isAdminEmail(email)) {
    const recent = await prisma.adminLoginCode.count({
      where: { email, createdAt: { gt: new Date(Date.now() - 60 * 60 * 1000) } },
    });
    if (recent < 5) {
      const code = newCode();
      await prisma.adminLoginCode.create({
        data: { email, codeHash: hashCode(code), expiresAt: new Date(Date.now() + 15 * 60 * 1000) },
      });
      await sendAdminCode(email, code);
    }
  }
  return Response.json({ ok: true });
});
