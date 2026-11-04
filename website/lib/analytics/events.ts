// Event names and their properties (requirements §8.2). One typed map for web, server and app,
// so names can't drift between dashboards. Never put prayer, chat or journal text in properties.

type Source = "web" | "app_store" | "play_store";
export type Placement = "funnel" | "onboarding" | "companion_quota" | "library" | "prayer" | "me" | "settings";

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
  checkout_started: { product_id: string; placement?: Placement }; // the store purchase sheet in the app (there is no web checkout)
  purchase_cancelled: { product_id: string; placement?: Placement };
  purchase_failed: { product_id: string; placement?: Placement };
  purchases_restored: { found: boolean };
  // Purchases come from the server (RevenueCat webhooks). `sandbox`: TestFlight / App Review / test purchases.
  trial_started: { product_id: string; source: Source; sandbox?: boolean };
  subscription_started: { product_id: string; source: Source; price: number; trial_conversion?: boolean; sandbox?: boolean };
  subscription_renewed: { product_id: string; source: Source; price?: number; sandbox?: boolean };
  subscription_canceled: { product_id: string; source: Source; reason?: string; sandbox?: boolean };
  subscription_expired: { product_id: string; source: Source; reason?: string; sandbox?: boolean };
  billing_issue: { product_id: string; source: Source; sandbox?: boolean };
  refund_issued: { product_id: string; source: Source; sandbox?: boolean };
  app_download_clicked: { placement: string }; // web "App Store / Google Play" buttons: "<where>:<store>"
  app_opened: { is_first_open: boolean };
  login_link_used: { success: boolean };
  // 6-digit email code typed on the funnel's "Welcome back" step
  login_code_used: { success: boolean; placement: string };
  onboarding_completed: { path: "web" | "app_store" };
  push_permission_result: { granted: boolean };
  today_prayer_viewed: { prayer_type: string };
  prayer_viewed: { prayer_slug: string; locked: boolean };
  prayer_audio_played: { prayer_type: string; prayer_slug: string; minutes?: number };
  prayer_audio_finished: { prayer_type: string; prayer_slug: string; minutes?: number };
  prayer_marked_done: { prayer_type: string };
  verse_of_day_viewed: Record<string, never>;
  verse_shared: Record<string, never>;
  chat_conversation_started: Record<string, never>;
  chat_message_sent: { message_count_today: number; tier: "free" | "premium"; quick_prompt?: string };
  chat_message_blocked: { category: "off_topic" | "jailbreak" | "crisis" | "abuse"; tier: "free" | "premium" };
  chat_limit_reached: { tier: "free" | "premium"; limit: number };
  verse_chip_opened: { reference: string };
  streak_goal_set: { goal: number };
  streak_week_completed: { goal: number };
  ai_companion_toggled: { enabled: boolean };
  guest_started: Record<string, never>; // the app opened without an account (welcome screen cross)
};

export type EventName = keyof AnalyticsEvents;
