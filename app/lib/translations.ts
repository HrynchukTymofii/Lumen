import type { Translation } from "@/lib/api/types";

// The Bible translations a user can read in (all public domain). Settings → General and the book picker use this.
export const TRANSLATIONS: {
  value: Translation;
  label: string;
  name: string;
}[] = [
  { value: "KJV", label: "King James", name: "King James Version" },
  { value: "WEB", label: "World English", name: "World English Bible" },
  { value: "BSB", label: "Berean Standard", name: "Berean Standard Bible" },
  { value: "DRA", label: "Douay-Rheims", name: "Douay-Rheims" },
];
