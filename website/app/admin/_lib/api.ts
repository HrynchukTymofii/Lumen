"use client";

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public problems: string[] = [],
  ) {
    super(message);
  }
}

// fetch for /api/admin/*: JSON in/out, readable errors, back to login when the session ends.
export async function api<T>(path: string, init?: { method?: string; body?: unknown }): Promise<T> {
  const res = await fetch(path, {
    method: init?.method ?? "GET",
    headers: init?.body !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: init?.body !== undefined ? JSON.stringify(init.body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401 && !path.startsWith("/api/admin/auth/")) {
    window.location.href = `/admin/login?next=${encodeURIComponent(window.location.pathname)}`;
  }
  if (!res.ok) throw new ApiError(data.error ?? `Request failed (${res.status})`, res.status, data.problems ?? data.issues);
  return data as T;
}

export const SCENES = ["dawn", "golden", "lake", "meadow", "dusk", "evening", "night", "sky"] as const;
export const CATEGORIES = ["morning", "evening", "peace", "psalms", "grief", "family", "sleep"] as const;

export type Status = "draft" | "review" | "published" | "archived";
export type Line = { t: number | null; text: string };
export type Variant = { minutes: 1 | 3 | 5; url: string | null; durationSec: number | null; lines: Line[] };

export type Track = {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  category: string;
  tags: string[];
  scene: string;
  imageUrl: string | null;
  scriptureRefs: string[];
  variants: Variant[];
  isPremium: boolean;
  status: Status;
  publishAt: string | null;
  order: number;
  source: string;
  reviewedBy: string | null;
  updatedAt: string;
};

export type TrackRow = Omit<Track, "variants"> & { variants: { minutes: number; hasAudio: boolean }[] };

export const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
