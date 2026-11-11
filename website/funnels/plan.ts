import type { Answers } from "./types";
import { ALL_STRUGGLES, FUNNEL_DENOMINATIONS, labelOf } from "./options";
import { translationOf } from "./stored";
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
  loved_one: [["Lift them up", "Pray for them by name"], ["Trust them to God", "What you can't fix, you can pray"]],
  caregiving: [["Strength for the carer", "Rest for the one who gives"], ["Seen by God", "The tired parts no one else sees"]],
  marriage: [["A threefold cord", "Pray for the two of you"], ["Soft hearts", "Words that heal, not wound"]],
  hurt: [["Name the hurt", "Bring what happened to God"], ["One step toward forgiving", "Not forgetting, letting go"]],
};

// "A prayer for worry", "Built around your family": the first thing they named, in a few words
const TOPIC: Record<string, string> = {
  anxiety: "worry",
  grief: "grief",
  family: "your family",
  work: "work and money",
  health: "your health",
  loneliness: "loneliness",
  doubt: "your doubts",
  guilt: "guilt",
  gratitude: "gratitude",
  loved_one: "someone you love",
  caregiving: "caring for someone",
  marriage: "your marriage",
  hurt: "a hurt you can't let go of",
};
export const topicOf = (answers: Answers) => TOPIC[answers.struggles?.[0] ?? ""] ?? "what you're carrying";

// ---- Web funnel v3 (funnels/struggle.ts) ----

/** The struggle the funnel's words are about: praying for someone they love wins, then the first thing they named */
export const funnelTopic = (a: Answers) => (a.prayingFor === "loved_one" ? "loved_one" : (a.struggles?.[0] ?? "anxiety"));

// Paywall title: "your plan for peace about …" (gratitude has its own title)
const PEACE_ABOUT: Record<string, string> = {
  anxiety: "your worries",
  loved_one: "someone you love",
  caregiving: "caring for someone",
  marriage: "your marriage",
  work: "work and money",
  health: "your health",
  grief: "your loss",
  hurt: "an old hurt",
  loneliness: "feeling alone",
  doubt: "your doubts",
  guilt: "what you regret",
  family: "your family",
};
export function paywallTitle(a: Answers) {
  const about = PEACE_ABOUT[funnelTopic(a)];
  const rest = about ? `your plan for peace about ${about}` : "your plan for a steady, grateful heart";
  return a.firstName ? `${a.firstName}, ${rest}` : rest[0].toUpperCase() + rest.slice(1);
}

// Loader: "Choosing verses about …"
const VERSE_THEME: Record<string, string> = {
  anxiety: "God's care",
  loved_one: "blessing the ones you love",
  caregiving: "new strength",
  marriage: "holding together",
  work: "God's provision",
  health: "healing",
  grief: "comfort in loss",
  hurt: "forgiveness",
  loneliness: "never being alone",
  doubt: "honest faith",
  guilt: "mercy",
  gratitude: "joy and thanks",
  family: "love at home",
};

const TRANSLATION_NAME: Record<string, string> = { KJV: "KJV", WEB: "WEB", BSB: "BSB", DRA: "Douay-Rheims" };
export const translationName = (a: Answers) => TRANSLATION_NAME[translationOf(a) ?? "KJV"];

/** The loading screen's lines, spoken in their own answers */
export function loaderLines(a: Answers) {
  const carried = (a.struggles ?? []).filter((s) => s !== "gratitude" && TOPIC[s]).slice(0, 2).map((s) => TOPIC[s]);
  return [
    carried.length ? `Reading what you carry: ${carried.join(" and ")}` : "Reading your answers",
    `Choosing verses about ${VERSE_THEME[funnelTopic(a)] ?? "God's care"}`,
    `Shaping your 28-day journey in the ${translationName(a)}`,
    "Finding your first prayer",
  ];
}

/** "Built from your answers: Catholic · Douay-Rheims · your health" */
export function journeyBasis(a: Answers) {
  const d = a.denomination === "free_church" ? "protestant" : a.denomination;
  const tradition = ["protestant", "catholic", "orthodox"].includes(d ?? "") ? labelOf(FUNNEL_DENOMINATIONS, d) : "";
  return [tradition, translationName(a), TOPIC[funnelTopic(a)]].filter(Boolean).join(" · ");
}

export const JOURNEY_WEEKS: [string, string][] = [
  ["Week 1", "Naming what you carry"],
  ["Week 2", "Bringing it to God"],
  ["Week 3", "Letting go of what you can't control"],
  ["Week 4", "Rest, and looking back at what God answered"],
];

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
  const things = (answers.struggles ?? []).filter((s) => s !== "gratitude").map((s) => labelOf(ALL_STRUGGLES, s).toLowerCase());
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
