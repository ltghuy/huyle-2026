import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Practices moved into the React Practices section; old links keep working
  // (query strings, like a wizard's ?step=, are passed through).
  redirects() {
    return [
      { source: "/practices", destination: "/react-practices", permanent: true },
      { source: "/practices/:slug", destination: "/react-practices/:slug", permanent: true },
    ];
  },
  // API responses aren't pages: keep them out of search results without
  // blocking them in robots.txt, since pages fetch from them while rendering.
  headers() {
    return Promise.resolve([{ source: "/api/:path*", headers: [{ key: "X-Robots-Tag", value: "noindex" }] }]);
  },
};

export default nextConfig;

// Enables the Cloudflare bindings/dev platform when running `next dev`.
// No-op in production builds.
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
initOpenNextCloudflareForDev();
