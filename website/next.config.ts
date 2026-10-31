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
