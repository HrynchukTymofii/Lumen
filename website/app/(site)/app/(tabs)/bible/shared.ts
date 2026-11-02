// Shared by the Bible pages (server) and the reader (client).

/** Where reading stopped, "John.3", so the Bible tab opens there again */
export const LAST_READ_COOKIE = "lumen_bible";

export const HIGHLIGHT_COLORS = ["yellow", "green", "blue", "pink"] as const;
export type HighlightColor = (typeof HIGHLIGHT_COLORS)[number];

/** Same pastel per color as the app (app/components/ui/theme.ts highlightColor) */
export const highlightVar = (color: string | null | undefined) =>
  color === "green" ? "var(--sage)" : color === "blue" ? "var(--sky)" : color === "pink" ? "var(--rose)" : "var(--butter)";

export type Mark = { highlight: boolean; color: HighlightColor | null; note: string };

export type Chapter = {
  book: { id: number; osis: string; name: string };
  chapter: number;
  translation: string;
  verses: { v: number; text: string }[];
  prev: { osis: string; chapter: number } | null;
  next: { osis: string; chapter: number } | null;
};
