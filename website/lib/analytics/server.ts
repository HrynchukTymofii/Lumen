import "server-only";
import { PostHog } from "posthog-node";
import type { AnalyticsEvents, EventName } from "./events";

let client: PostHog | null = null;

function posthog() {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!key) return null;
  client ??= new PostHog(key, {
    host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com",
    flushAt: 1, // serverless: send right away instead of batching
    flushInterval: 0,
  });
  return client;
}

// Events only the server sees (webhooks, safety pipeline). distinctId = our user id.
export async function trackServer<E extends EventName>(userId: string, event: E, props: AnalyticsEvents[E]) {
  const ph = posthog();
  if (!ph) return;
  try {
    await ph.captureImmediate({ distinctId: userId, event, properties: props });
  } catch (err) {
    console.error("[analytics]", err); // analytics must never break a webhook
  }
}
