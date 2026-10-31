import { unstable_rethrow } from "next/navigation";
import { NextResponse } from "next/server";
import { z } from "zod";
import { HttpError } from "@/lib/admin-auth";
import { Prisma } from "@/lib/generated/prisma/client";

// Wraps a route handler so thrown HttpError / zod / Prisma errors become clean JSON responses.
export function handle<A extends unknown[]>(fn: (...args: A) => Promise<Response>) {
  return async (...args: A): Promise<Response> => {
    try {
      return await fn(...args);
    } catch (err) {
      unstable_rethrow(err); // let Next's own control-flow errors (prerender, redirect) through
      if (err instanceof HttpError) {
        return NextResponse.json({ error: err.message, ...err.extra }, { status: err.status });
      }
      if (err instanceof z.ZodError) {
        return NextResponse.json(
          { error: "Invalid input", issues: err.issues.map((i) => `${i.path.join(".")}: ${i.message}`) },
          { status: 400 },
        );
      }
      if (err instanceof Prisma.PrismaClientKnownRequestError) {
        if (err.code === "P2002") return NextResponse.json({ error: "That slug is already used" }, { status: 409 });
        if (err.code === "P2025") return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
      console.error(err);
      return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
    }
  };
}

export async function readJson(req: Request) {
  try {
    return await req.json();
  } catch {
    throw new HttpError(400, "Body must be JSON");
  }
}
