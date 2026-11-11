// No imports on purpose: the phone app reads funnels/plan.ts, which uses these (and the app has no zod).
// Funnel answers that are stored as another value
type Denomination = "catholic" | "protestant" | "orthodox" | "not_sure" | "exploring";
type AiComfort = "comfortable" | "unsure" | "background";
type Translation = "WEB" | "KJV" | "DRA" | "BSB";

export const denominationOf = (v: string | undefined) => (v === "free_church" ? "protestant" : v) as Denomination | undefined;
export const aiComfortOf = (v: string | undefined) => (v === "verses" ? "comfortable" : v) as AiComfort | undefined;
/** "Not sure" picks Douay-Rheims for Catholics and the KJV for everyone else */
export function translationOf(a: { translation?: string; denomination?: string }): Translation | undefined {
  if (!a.translation) return undefined;
  if (a.translation === "not_sure") return a.denomination === "catholic" ? "DRA" : "KJV";
  return a.translation as Translation;
}
/** What they shared, as a note the companion reads (User.memorySummary) */
export const shareNote = (share: string | undefined) => (share ? `When they signed up they shared: "${share}"` : undefined);
