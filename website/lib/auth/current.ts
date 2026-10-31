import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { USER_COOKIE, verifyUserToken } from "./session";

// For server components and pages: the signed-in user, or null.
export async function getCurrentUser() {
  const session = await verifyUserToken((await cookies()).get(USER_COOKIE)?.value);
  if (!session) return null;
  return prisma.user.findUnique({ where: { id: session.id } });
}

export async function requirePageUser(next = "/app") {
  const user = await getCurrentUser();
  if (!user) redirect(`/app/login?next=${encodeURIComponent(next)}`);
  return user;
}
