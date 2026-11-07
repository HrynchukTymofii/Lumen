// The Bible translations a user can read in (all public domain). Web Settings and the Books page use this; the app
// keeps the same list in app/lib/translations.ts.
export const TRANSLATIONS = [
  { value: "WEB", name: "World English Bible" },
  { value: "KJV", name: "King James Version" },
  { value: "BSB", name: "Berean Standard Bible" },
  { value: "DRA", name: "Douay-Rheims" },
] as const;
