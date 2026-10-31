import PostHog from "posthog-react-native";
import { Platform } from "react-native";
import { POSTHOG_HOST, POSTHOG_KEY } from "@/lib/config";

// PostHog for the app (SPEC §11), adapted from PDR_pl lib/analytics.ts. The same project as the website,
// and identify() uses the same user id, so the web funnel and app usage are one person.
// Never send prayer, chat or journal text: ids, categories and counts only.

// Copy of website/lib/analytics/events.ts (the app can't import from website/). Keep the two in sync.
type Source = "web" | "app_store" | "play_store";
type Placement = "funnel" | "onboarding" | "companion_quota" | "library" | "settings";

export type AnalyticsEvents = {
  quiz_started: { funnel_slug: string };
  quiz_step_completed: { funnel_slug: string; step_id: string; answer: string | string[] };
  sample_prayer_generated: { latency_ms: number };
  paywall_viewed: { variant: string; placement: Placement };
  plan_selected: { product_id: string };
  trial_started: { product_id: string; source: Source };
  subscription_started: { product_id: string; source: Source; price: number };
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
  verse_chip_opened: { reference: string };
  streak_goal_set: { goal: number };
  streak_week_completed: { goal: number };
  ai_companion_toggled: { enabled: boolean };
};

export type EventName = keyof AnalyticsEvents;

// Off without a key, and on the Expo web build (only a dev convenience; the website has its own PostHog)
export const posthog =
  POSTHOG_KEY && Platform.OS !== "web"
    ? new PostHog(POSTHOG_KEY, {
        host: POSTHOG_HOST,
        // Installs, opens and backgrounding: the base of the retention charts
        captureAppLifecycleEvents: true,
        // A profile for every install, also before signing in; identify() merges it into the account
        personProfiles: "always",
        enableSessionReplay: false,
      })
    : null;

// Sent with every event; reset() clears them, so they are registered again after a sign-out
function registerAppProperties() {
  posthog?.register({ debug_build: __DEV__ }).catch(() => {});
}

registerAppProperties();

export function track<E extends EventName>(event: E, ...[properties]: AnalyticsEvents[E] extends Record<string, never> ? [] : [AnalyticsEvents[E]]) {
  posthog?.capture(event, properties);
}

export function trackScreen(pathname: string) {
  posthog?.screen(pathname).catch(() => {});
}

// Signed in: this install's anonymous history joins the account
export function identifyUser(user: { id: string; email: string }, isPremium: boolean) {
  posthog?.identify(user.id, { email: user.email, is_premium: isPremium });
}

// Signed out: the next events start a new anonymous profile
export function resetUser() {
  posthog?.reset();
  registerAppProperties();
}
