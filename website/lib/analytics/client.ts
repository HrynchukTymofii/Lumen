"use client";

import posthog from "posthog-js";
import type { AnalyticsEvents, EventName } from "./events";

// Typed wrappers so every call site uses a known event name and shape.
export function track<E extends EventName>(event: E, props: AnalyticsEvents[E]) {
  if (posthog.__loaded) posthog.capture(event, props);
}

// After email / login: ties the anonymous funnel journey to the user
export function identify(userId: string, props?: Record<string, string | number | boolean | string[] | null>) {
  if (posthog.__loaded) posthog.identify(userId, props);
}

export function resetAnalytics() {
  if (posthog.__loaded) posthog.reset();
}
