// Category names, as in the app (app/lib/play.ts)
const CATEGORY_TITLES: Record<string, string> = {
  morning: "Morning prayers",
  evening: "Evening prayers",
  peace: "Peace & calm",
  psalms: "Scripture reflections",
  grief: "Grief & comfort",
  family: "Family",
  sleep: "Sleep",
  quick: "Quick prayers",
};

export const categoryTitle = (key: string) => CATEGORY_TITLES[key] ?? key.charAt(0).toUpperCase() + key.slice(1);
