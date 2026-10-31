import api from "./client";
import type { Library } from "./types";

// The whole prayer catalog (website/app/api/library/route.ts). Small enough to load at once; the prayer screen
// reads from the same copy, so opening a prayer needs no request.
let cached: Library | null = null;

export function cachedLibrary() {
  return cached;
}

export async function getLibrary() {
  const { data } = await api.get<Library>("/library");
  cached = data;
  return data;
}
