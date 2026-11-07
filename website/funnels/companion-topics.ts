// What the companion can do, said for what this person told us they're carrying (the quiz's STRUGGLES,
// funnels/options.ts). Shown on Home ("Talk it through") and on the Companion tab, in the phone app
// (app/lib/companionTopics.ts) and the web app, so people see how to use it instead of facing an empty chat.
// The first struggle they picked leads.

export type CompanionTopic = {
  /** Short line next to the companion's name */
  hint: string;
  /** The Home card's one sentence: a question, then the invitation (set in a different type) */
  line: [string, string];
  /** A sentence or two on the Companion tab: what we can talk about */
  invite: string;
  /** Tap to send as the first message */
  prompts: string[];
};

const TOPICS: Record<string, CompanionTopic> = {
  loneliness: {
    hint: "Feeling alone lately? Tell me about your day.",
    line: ["Feeling alone lately?", "Tell me about your day."],
    invite: "You mentioned feeling lonely. You can tell me about your day, what was hard and what was good. I’ll listen, and we can find words from Scripture for it together.",
    prompts: ["Can I tell you about my day?", "I feel lonely tonight", "Pray with me about feeling alone"],
  },
  anxiety: {
    hint: "What’s worrying you? Let’s hand it over together.",
    line: ["Worried about something?", "Let’s hand it over together."],
    invite: "You mentioned worry. Tell me what’s on your mind, big or small. We can pray about it and find verses that speak to it.",
    prompts: ["I can’t stop worrying about…", "Give me a verse for anxiety", "Pray with me before I sleep"],
  },
  grief: {
    hint: "Missing someone? You can talk about them here.",
    line: ["Missing someone today?", "You can talk about them here."],
    invite: "You mentioned grief. You can tell me about the person you miss, or just how today feels. We’ll take it slowly.",
    prompts: ["I miss someone today", "Where is God in my grief?", "Pray for my family as we grieve"],
  },
  family: {
    hint: "Something on your heart about family?",
    line: ["Something on your heart about family?", "Let’s pray it through."],
    invite: "You mentioned family or relationships. Tell me what’s going on, and we can pray for the people involved and look at what Scripture says.",
    prompts: ["Help me forgive someone", "Pray for my family", "How do I love someone difficult?"],
  },
  work: {
    hint: "Heavy week at work? Talk it through.",
    line: ["Heavy week?", "Talk it through with me."],
    invite: "You mentioned work or money. Tell me what’s weighing on you. We can pray for wisdom and peace, and find verses on provision.",
    prompts: ["I’m stressed about money", "Pray for my work tomorrow", "A verse for when I feel stuck"],
  },
  health: {
    hint: "How are you feeling today?",
    line: ["How are you feeling today?", "I’m here to listen."],
    invite: "You mentioned health. Tell me how you’re feeling, in body or in spirit. We can pray for healing and strength together.",
    prompts: ["Pray for my health", "I’m scared about a diagnosis", "A verse for strength today"],
  },
  doubt: {
    hint: "Questions about faith are welcome here.",
    line: ["Big questions about faith?", "Ask me anything."],
    invite: "You mentioned doubts. Ask anything, even the hard questions. Every answer quotes real verses, so you can read them yourself.",
    prompts: ["Why does God allow suffering?", "How do I know God hears me?", "Explain a verse I don’t understand"],
  },
  guilt: {
    hint: "Carrying something you regret?",
    line: ["Carrying something you regret?", "There’s grace for that."],
    invite: "You mentioned guilt or regret. You can tell me about it without judgment. We can pray for forgiveness and read what God says about grace.",
    prompts: ["I can’t forgive myself", "What does the Bible say about grace?", "Pray with me for a fresh start"],
  },
  gratitude: {
    hint: "Grateful today? Let’s say thank you together.",
    line: ["Grateful today?", "Let’s say thank you together."],
    invite: "You mentioned being grateful. Tell me what you’re thankful for and we’ll turn it into a prayer, or ask anything about the Bible.",
    prompts: ["Help me write a thank-you prayer", "A psalm of thanksgiving", "Explain this week’s verse"],
  },
};

const DEFAULT_TOPIC: CompanionTopic = {
  hint: "What’s on your heart? Talk, ask or pray.",
  line: ["What’s on your heart?", "Talk it through with me."],
  invite: "Talk about your day, ask a question about the Bible, or ask for a prayer for what you’re carrying. Every answer quotes real verses.",
  prompts: ["Pray for me", "Explain this verse", "I’m struggling with…", "Give me a verse for…", "Help me forgive"],
};

/** The topic for what someone said they're carrying (the first struggle that has one), or the general one */
export function companionTopic(struggles: string[] | null | undefined): CompanionTopic {
  const first = struggles?.find((s) => TOPICS[s]);
  return first ? TOPICS[first] : DEFAULT_TOPIC;
}
