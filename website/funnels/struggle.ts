import {
  CARRY_ALONE,
  CARRYING_SINCE,
  FEW_MINUTES,
  FREQUENCY,
  FUNNEL_AI_COMFORT,
  FUNNEL_DENOMINATIONS,
  FUNNEL_STRUGGLES,
  OBSTACLE_NONE,
  OBSTACLES,
  PRAYER_TIME,
  PRAYING_FOR,
  TRANSLATIONS,
} from "./options";
import type { AdTheme, Answers, FunnelConfig } from "./types";

// The web funnel, v3 (from the "Holy Hush Funnel" prototype of 2026-11-10). The phone app's quiz is the earlier
// version, frozen in app-quiz.ts, so changes here don't reach the app.

// Someone who only picked "Nothing heavy, I'm grateful" isn't asked how long or how heavy
const onlyGrateful = (a: Answers) => a.struggles?.length === 1 && a.struggles[0] === "gratitude";

// The ad's promise, repeated on the first screen (?utm_content=b8). Codes are the creatives library's.
const THEMES: Record<string, AdTheme> = {
  k1: { code: "K1", title: "Can't find the words to pray?", cta: "Find the words", prefill: { obstacles: ["words"] } },
  k2: { code: "K2", title: "Awake at 2 a.m. with worry?", cta: "Find peace tonight", prefill: { struggles: ["anxiety"] } },
  k3: { code: "K3", title: "Only have a few minutes to pray?", cta: "Pray in a few minutes", prefill: { obstacles: ["time"] } },
  k6: { code: "K6", title: "Ready to start Day 1 tonight?", cta: "Start Day 1 tonight" },
  k8: { code: "K8", title: "Want to pray it honestly?", cta: "Pray it honestly", prefill: { struggles: ["doubt"] } },
  b1: { code: "B1", title: "Want to pray for someone you love?", cta: "Pray for them tonight", prefill: { struggles: ["loved_one"], prayingFor: "loved_one" } },
  b2: { code: "B2", title: "Caring for everyone but yourself?", cta: "Take a quiet moment", prefill: { struggles: ["caregiving"] } },
  b3: { code: "B3", title: "Rather listen than read?", cta: "Listen to a prayer", prefill: { obstacles: ["focus"] } },
  b4: { code: "B4", title: "Is worry your first reaction?", cta: "Pray through the worry", prefill: { struggles: ["anxiety"] } },
  b5: { code: "B5", title: "Ready to start praying again?", cta: "Start again tonight", prefill: { obstacles: ["consistency"] } },
  b6: { code: "B6", title: "Something you can't say out loud?", cta: "Say it to God" },
  b7: { code: "B7", title: "Want a prayer before you sleep?", cta: "Hear a bedtime prayer" },
  b8: { code: "B8", title: "Is your marriage hurting?", cta: "Bring it to God tonight", prefill: { struggles: ["marriage"] } },
  b9: { code: "B9", title: "Carrying it all by yourself?", cta: "Let God carry it", prefill: { carryAlone: "mostly" } },
  b10: { code: "B10", title: "Still carrying a hurt?", cta: "Lay it down tonight", prefill: { struggles: ["hurt"] } },
};

// "Not alone": the words follow how heavy it feels
const LIGHT = {
  title: "Even small things are worth bringing to God.",
  verse: { ref: "Philippians 4:6", text: "In nothing be anxious, but in everything, by prayer and petition with thanksgiving, let your requests be made known to God." },
};
const HEAVY = {
  title: "That's a heavy load. You don't have to hold it on your own.",
  verse: {
    ref: "Isaiah 41:10",
    text: "Don’t you be afraid, for I am with you. Don’t be dismayed, for I am your God. I will strengthen you. Yes, I will help you. Yes, I will uphold you with the right hand of my righteousness.",
  },
};

export const struggle: FunnelConfig = {
  slug: "struggle",
  hook: "Carrying something heavy? Get a prayer for exactly that.",
  hypothesis: "People in a hard moment will finish a short quiz and start a paid plan for a prayer journey built for their situation.",
  scene: "dusk",
  plans: ["yearly", "monthly"],
  steps: [
    {
      id: "landing",
      type: "landing",
      title: "Carrying something heavy?",
      subtitle:
        "Answer a few gentle questions and get a short prayer for what you're carrying, with real Bible verses. Then a prayer companion that remembers your life walks with you, day by day.",
      cta: "Start",
      scene: "dusk",
      themes: THEMES,
    },
    {
      id: "carrying",
      type: "multi",
      title: "What are you carrying right now?",
      subtitle: "Choose up to 3.",
      options: FUNNEL_STRUGGLES,
      answerKey: "struggles",
      maxSelect: 3,
      sensitive: true,
    },
    {
      id: "praying-for",
      type: "single",
      title: "Who are you praying for?",
      subtitle: "You can pray for yourself, for someone else, or both.",
      options: PRAYING_FOR,
      answerKey: "prayingFor",
      sensitive: true,
    },
    {
      id: "carrying-since",
      type: "single",
      title: "How long have you been carrying this?",
      options: CARRYING_SINCE,
      answerKey: "carryingSince",
      sensitive: true,
      skip: onlyGrateful,
    },
    {
      id: "burden",
      type: "scale",
      title: "How heavy does it feel today?",
      statement: "Right now, this weighs on me…",
      low: "A little",
      high: "A lot",
      answerKey: "burden",
      sensitive: true,
      skip: onlyGrateful,
    },
    {
      id: "not-alone",
      type: "insight",
      title: "You don't have to carry this alone.",
      body: "Thank you for being honest. That is where prayer starts.",
      verse: { ref: "Matthew 11:28", text: "Come to me, all you who labor and are heavily burdened, and I will give you rest." },
      follows: { answerKey: "burden", variants: { "1": LIGHT, "2": LIGHT, "4": HEAVY, "5": HEAVY } },
      scene: "lake",
      skip: onlyGrateful,
    },
    {
      id: "carry-alone",
      type: "single",
      title: "Do you carry most of it on your own?",
      subtitle: "Many people never say this out loud.",
      options: CARRY_ALONE,
      answerKey: "carryAlone",
      sensitive: true,
      skip: onlyGrateful,
    },
    { id: "frequency", type: "single", title: "How often do you pray now?", options: FREQUENCY, answerKey: "prayerFrequency" },
    {
      id: "obstacles",
      type: "multi",
      title: "What gets in the way?",
      subtitle: "Choose any.",
      options: OBSTACLES,
      answerKey: "obstacles",
      // Follows on from "How often do you pray now?"
      follows: {
        answerKey: "prayerFrequency",
        variants: {
          daily: {
            title: "Every day, that's wonderful. What still makes it hard some days?",
            subtitle: "Even daily prayer has its harder days. Choose any.",
            extra: [OBSTACLE_NONE],
          },
          weekly: { title: "What keeps you from praying every day?", subtitle: "Choose any." },
          sometimes: { title: "What gets in the way?", subtitle: "Choose any." },
          never: { title: "What's kept you from praying?", subtitle: "No judgement here. Choose any." },
        },
      },
    },
    {
      id: "obstacle-insight",
      type: "obstacle-insight",
      scene: "meadow",
      prefer: "words",
      insights: {
        words: ["You don't need the right words.", "We'll give you a prayer to start from, and you can make it your own."],
        time: ["A few quiet minutes is enough.", "Your daily prayer takes about as long as making a coffee."],
        focus: ["Listening helps a wandering mind.", "Guided prayers are read aloud to you, so you only need to follow along."],
        consistency: ["Missing a day doesn't undo anything.", "Your weekly goal forgives missed days, and we'll remind you at the time you pick."],
        distance: ["You're in good company.", "The Psalms are full of people who felt the same and kept praying."],
        none: ["Let's help you go deeper.", "Each day's prayer is written around what you're carrying, so it never turns into routine."],
      },
    },
    {
      id: "denomination",
      type: "single",
      title: "Which tradition feels like home?",
      subtitle: "Your journey will fit your tradition. Kept private.",
      options: FUNNEL_DENOMINATIONS,
      answerKey: "denomination",
      sensitive: true,
    },
    {
      id: "translation",
      type: "single",
      title: "Which Bible translation do you like to read?",
      subtitle: "Every verse in your journey will come from it. You can change it anytime.",
      options: TRANSLATIONS,
      answerKey: "translation",
    },
    {
      id: "ai",
      type: "single",
      title: "How do you feel about AI helping you pray?",
      subtitle: "Every verse it shows is loaded from the Bible text, never invented.",
      options: FUNNEL_AI_COMFORT,
      answerKey: "aiComfort",
    },
    {
      id: "minutes",
      type: "single",
      title: "Would a few quiet minutes a day help?",
      subtitle: "Most prayers in Holy Hush take a few minutes or less.",
      options: FEW_MINUTES,
      answerKey: "fewMinutes",
    },
    {
      id: "share",
      type: "text",
      title: "Want to tell God more?",
      subtitle: "Optional. Your companion will remember it, pray about it with you, and check in on how it's going.",
      placeholder: "e.g. My mom has surgery on Friday and I can't stop worrying…",
      answerKey: "share",
      multiline: true,
      maxLength: 400,
      note: "🔒 Private. Only you can see this.",
    },
    {
      id: "name",
      type: "text",
      title: "What should we call you?",
      subtitle: "Optional. Your prayer can use your first name.",
      placeholder: "First name",
      answerKey: "firstName",
    },
    {
      id: "thanks",
      type: "insight",
      title: "Thank you for trusting us with this.",
      body: "We'll put your answers together now.",
      follows: { answerKey: "carryAlone", variants: { mostly: { body: "You've been carrying a lot on your own. Let's hand some of it over." } } },
      scene: "golden",
      named: true,
    },
    {
      id: "loading",
      type: "loading",
      personal: true,
      // Prayer time is asked only here (not as a quiz question)
      messages: ["Reading your answers", "Choosing verses for you", "Shaping your 28-day journey", "Finding your first prayer"],
      micro: { title: "When would you like to pray?", options: PRAYER_TIME, answerKey: "prayerTime" },
    },
    { id: "email", type: "email" },
    { id: "prayer", type: "prayer" },
    { id: "path", type: "path" },
    { id: "paywall", type: "paywall" },
  ],
};
