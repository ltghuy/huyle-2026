import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
import { version } from "./package.json";

const nextConfig: NextConfig = {
  // Inlined at build time for the sidebar footer, so the client bundle
  // doesn't carry the whole package.json (quick 022).
  env: { NEXT_PUBLIC_APP_VERSION: version },
  // API responses aren't pages: keep them out of search results without
  // blocking them in robots.txt, since pages fetch from them while rendering.
  headers() {
    return Promise.resolve([{ source: "/api/:path*", headers: [{ key: "X-Robots-Tag", value: "noindex" }] }]);
  },
};

export default nextConfig;

// Enables the Cloudflare bindings/dev platform when running `next dev`.
// No-op in production builds.
void initOpenNextCloudflareForDev();
