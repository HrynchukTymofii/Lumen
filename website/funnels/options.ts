// Reusable answer options. The values are stored on the user, so keep them stable.
// No imports on purpose: the phone app imports this file directly (app/metro.config.js).

// exclusive: picking it clears the others on a multi-choice question (and picking another clears it)
export type Option = { value: string; label: string; hint?: string; exclusive?: boolean };

export const STRUGGLES: Option[] = [
  { value: "anxiety", label: "Worry or anxiety" },
  { value: "grief", label: "Grief or loss" },
  { value: "family", label: "Family or relationships" },
  { value: "work", label: "Work or money" },
  { value: "health", label: "Health" },
  { value: "loneliness", label: "Loneliness" },
  { value: "doubt", label: "Doubts about faith" },
  { value: "guilt", label: "Guilt or regret" },
  { value: "gratitude", label: "Nothing heavy, I'm grateful" },
];

export const CARRYING_SINCE: Option[] = [
  { value: "days", label: "A few days" },
  { value: "weeks", label: "A few weeks" },
  { value: "months", label: "A few months" },
  { value: "always", label: "As long as I can remember" },
];

export const DENOMINATIONS: Option[] = [
  { value: "catholic", label: "Catholic" },
  { value: "protestant", label: "Protestant", hint: "Baptist, Methodist, non-denominational…" },
  { value: "orthodox", label: "Orthodox" },
  { value: "exploring", label: "Still exploring" },
  { value: "not_sure", label: "I'd rather not say" },
];

export const FREQUENCY: Option[] = [
  { value: "daily", label: "Every day" },
  { value: "weekly", label: "A few times a week" },
  { value: "sometimes", label: "Now and then" },
  { value: "never", label: "Rarely or never" },
];

export const OBSTACLES: Option[] = [
  { value: "time", label: "I don't have time" },
  { value: "words", label: "I don't know what to say" },
  { value: "focus", label: "My mind wanders" },
  { value: "consistency", label: "I forget or can't keep it up" },
  { value: "distance", label: "God feels far away" },
];
// Only offered to people who already pray every day
export const OBSTACLE_NONE: Option = { value: "none", label: "Nothing really, it comes easily", exclusive: true };

export const AI_COMFORT: Option[] = [
  { value: "comfortable", label: "Happy to try it", hint: "As long as the verses are real" },
  { value: "unsure", label: "Not sure yet", hint: "You can turn the companion off any time" },
  { value: "background", label: "Keep AI in the background", hint: "Prayers and Bible first, chat only if I ask" },
];

export const PRAYER_TIME: Option[] = [
  { value: "morning", label: "Morning" },
  { value: "evening", label: "Evening" },
  { value: "both", label: "Both" },
];

export const labelOf = (options: Option[], value: string | undefined) =>
  options.find((o) => o.value === value)?.label ?? value ?? "";
