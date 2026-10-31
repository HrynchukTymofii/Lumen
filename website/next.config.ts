import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  // PostHog through our own domain so ad blockers don't drop funnel events (SPEC §11)
  async rewrites() {
    const host = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com";
    const assets = host.replace("://us.i.", "://us-assets.i.").replace("://eu.i.", "://eu-assets.i.");
    return [
      { source: "/ingest/static/:path*", destination: `${assets}/static/:path*` },
      { source: "/ingest/:path*", destination: `${host}/:path*` },
    ];
  },
  // Only the `struggle` funnel exists for now; other quiz links (old ads, bookmarks) go there with their UTMs
  async redirects() {
    return [{ source: "/f/:slug(habit|scripture)", destination: "/f/struggle", permanent: false }];
  },
  // Dev only: the Expo web build (localhost:8081/8082) calls the API from another origin. "*" is fine because the
  // app sends a Bearer token, not cookies. The phone app needs no CORS.
  async headers() {
    if (process.env.NODE_ENV === "production") return [];
    return [
      {
        source: "/api/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Access-Control-Allow-Methods", value: "GET,POST,PATCH,DELETE,OPTIONS" },
          { key: "Access-Control-Allow-Headers", value: "Content-Type, Authorization, If-None-Match" },
          { key: "Access-Control-Expose-Headers", value: "x-refreshed-token, ETag" },
        ],
      },
    ];
  },
  skipTrailingSlashRedirect: true, // PostHog API paths end with a slash
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
