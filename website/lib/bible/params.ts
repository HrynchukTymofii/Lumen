import { z } from "zod";

// Query/path parameters shared by the /api/bible routes
export const translationParam = z.enum(["WEB", "KJV", "DRA"]).catch("WEB");

// The text is public domain and only changes when the import runs again
export const BIBLE_CACHE = "public, max-age=86400, stale-while-revalidate=604800";
