// Event names and their properties (requirements §8.2). One typed map for web, server and app,
// so names can't drift between dashboards. Never put prayer, chat or journal text in properties.

type Source = "web" | "app_store" | "play_store";
type Placement = "funnel" | "onboarding" | "companion_quota" | "library" | "settings";

export type AnalyticsEvents = {
  funnel_viewed: { funnel_slug: string };
  quiz_started: { funnel_slug: string };
  quiz_step_completed: { funnel_slug: string; step_id: string; answer: string | string[] };
  quiz_completed: { funnel_slug: string; duration_ms: number };
  plan_viewed: { funnel_slug: string };
  sample_prayer_generated: { latency_ms: number };
  email_submitted: { funnel_slug?: string };
  paywall_viewed: { variant: string; placement: Placement };
  plan_selected: { product_id: string };
  checkout_started: { product_id: string };
  trial_started: { product_id: string; source: Source };
  subscription_started: { product_id: string; source: Source; price: number };
  subscription_renewed: { product_id: string; source: Source };
  subscription_canceled: { product_id: string; source: Source };
  refund_issued: { product_id: string; source: Source };
  app_download_clicked: { placement: string };
  app_opened: { is_first_open: boolean };
  login_link_used: { success: boolean };
  onboarding_completed: { path: "web" | "app_store" };
  push_permission_result: { granted: boolean };
  today_prayer_viewed: { prayer_type: string };
  prayer_audio_played: { prayer_type: string; minutes?: number };
  prayer_marked_done: { prayer_type: string };
  verse_of_day_viewed: Record<string, never>;
  verse_shared: Record<string, never>;
  chat_message_sent: { message_count_today: number; tier: "free" | "premium" };
  chat_message_blocked: { category: "off_topic" | "jailbreak" | "crisis" | "abuse" };
  verse_chip_opened: { reference: string };
  streak_goal_set: { goal: number };
  streak_week_completed: { goal: number };
  ai_companion_toggled: { enabled: boolean };
};

export type EventName = keyof AnalyticsEvents;
