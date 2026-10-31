import posthog from "posthog-js";

// PostHog for the public site and web app (SPEC §11). Runs before the page becomes interactive.
const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const isAdmin = window.location.pathname.startsWith("/admin"); // don't count our own team as users

if (key && !isAdmin) {
  posthog.init(key, {
    api_host: "/ingest", // first-party path, rewritten to PostHog in next.config.ts
    ui_host: process.env.NEXT_PUBLIC_POSTHOG_UI_HOST ?? "https://us.posthog.com",
    defaults: "2026-08-30", // pageviews on client-side navigation, page leave, etc.
    person_profiles: "identified_only",
    // Prayers, intentions and chats are private: replays never show typed or rendered text
    session_recording: { maskAllInputs: true, maskTextSelector: "*" },
  });
}
