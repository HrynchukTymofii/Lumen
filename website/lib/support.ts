// Contact & Support form topics, shared by the website form, the API and the support email.
// The phone app keeps its own copy of the keys (app/lib/api/support.ts).
export const SUPPORT_TOPICS = {
  account: "Account & sign-in",
  subscription: "Subscription & billing",
  bug: "Something isn't working",
  feedback: "Ideas & feedback",
  other: "Something else",
} as const;

export type SupportTopic = keyof typeof SUPPORT_TOPICS;

export const SUPPORT_MESSAGE_MAX = 5000;
