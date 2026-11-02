import { pricesFor } from "@/lib/prices";

// GET /api/prices → the visitor's local App Store prices (from Vercel's IP country header), US prices otherwise.
// Used by the client-side paywall; server pages call pricesFor() directly.
export async function GET(req: Request) {
  return Response.json(pricesFor(req.headers.get("x-vercel-ip-country")), {
    headers: { "Cache-Control": "private, max-age=3600" },
  });
}
