import type { Answers } from "./types";
import { STRUGGLES, labelOf } from "./options";
import { versesFor, type Citation } from "./verses";

// The personalised 7-day path shown before the email step. Template-based (no AI), so it's instant.
const FOCUS: Record<string, [string, string][]> = {
  anxiety: [["Hand it over", "Name the worry and give it to God"], ["Peace for today", "Only today's portion"]],
  grief: [["Near the broken-hearted", "Bring the loss as it is"], ["Remembering with love", "Thanks for the one you miss"]],
  family: [["Bless your home", "Pray for each person by name"], ["Room to forgive", "Let go of one old hurt"]],
  work: [["Daily bread", "Trust for what you need"], ["Work as worship", "Offer the day's tasks"]],
  health: [["Strength for the body", "Ask for healing and patience"], ["Rest in him", "Quiet when you feel weak"]],
  loneliness: [["Never alone", "He goes with you"], ["Open a door", "Pray for one new connection"]],
  doubt: [["Honest prayer", "Bring the questions too"], ["Help my unbelief", "Faith the size of a seed"]],
  guilt: [["Coming home", "Confession without fear"], ["Made new", "Receive forgiveness"]],
  gratitude: [["Count the gifts", "Three things from today"], ["Joy in this day", "Praise for small things"]],
};

export type PlanDay = { day: number; title: string; focus: string };

export function buildPlan(answers: Answers): PlanDay[] {
  const picked = (answers.struggles?.length ? answers.struggles : ["anxiety"]).filter((s) => FOCUS[s]);
  const pool = picked.flatMap((s) => FOCUS[s]);
  const days: [string, string][] = [
    ["A first quiet minute", "Two minutes with the prayer written for you"],
    pool[0],
    pool[1] ?? pool[0],
    pool[2] ?? ["Psalm 23", "The Lord is my shepherd, slowly"],
    pool[3] ?? ["An honest evening", "Look back at the day with God"],
    ["Pray for someone else", "Carry another person's need"],
    ["Looking back", "What changed this week"],
  ];
  return days.map(([title, focus], i) => ({ day: i + 1, title, focus }));
}

// Used when the AI is off or slow: still personal, still only real verses.
export function fallbackPrayer(answers: Answers): { title: string; text: string; citations: Citation[] } {
  const [verse] = versesFor(answers.struggles);
  const things = (answers.struggles ?? []).filter((s) => s !== "gratitude").map((s) => labelOf(STRUGGLES, s).toLowerCase());
  const carrying = things.length ? things.join(", ").replace(/, ([^,]*)$/, " and $1") : "everything on my heart today";
  const grateful = answers.struggles?.includes("gratitude");
  return {
    title: grateful && !things.length ? "A Prayer of Thanks" : "Handing It Over",
    text: [
      answers.firstName ? `Lord, it's ${answers.firstName}. I come to you as I am today.` : "Lord, I come to you as I am today.",
      grateful && !things.length
        ? "Thank you for the gifts of this day, the ones I noticed and the ones I missed."
        : `You know what I'm carrying: ${carrying}. I don't have to hold it alone.`,
      `Your word says: “${verse.text.replace(/[.,;!]$/, "")}.”`,
      "Give me your peace for this day, one step at a time, and help me trust you with what I can't change.",
      "Amen.",
    ].join("\n\n"),
    citations: [verse],
  };
}
