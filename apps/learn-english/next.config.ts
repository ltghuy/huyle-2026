import type { NextConfig } from "next";
import { version } from "./package.json";

// Routes were renamed from Vietnamese to English; old links and bookmarks keep
// working. Query strings are passed through, so the old keys are renamed too.
const RENAMED = [
  ["/tu-vung", "/vocabulary"],
  ["/ngu-phap", "/grammar"],
  ["/on-tap", "/review"],
  ["/bai-tap", "/exercises"],
  ["/tu-kho", "/hard-words"],
  ["/ho-so", "/profile"],
  ["/cai-dat", "/settings"],
  ["/nguon-du-lieu", "/credits"],
  ["/bai-hoc", "/lesson"],
  ["/kiem-tra-trinh-do", "/placement"],
  ["/phien-on-tap", "/review-session"],
] as const;

/** Old query key per renamed page: `/ngu-phap?bai=x` → `/grammar?topic=x`. */
const RENAMED_KEYS = [
  ["/ngu-phap", "bai", "/grammar", "topic"],
  ["/tu-vung", "tu", "/vocabulary", "word"],
  ["/bai-tap", "loai", "/exercises", "type"],
] as const;

const nextConfig: NextConfig = {
  // Inlined at build time for the sidebar footer, so the client bundle
  // doesn't carry the whole package.json (quick 022).
  env: { NEXT_PUBLIC_APP_VERSION: version },
  redirects() {
    return Promise.resolve([
      // Listed first: the first matching redirect wins.
      ...RENAMED_KEYS.map(([source, key, destination, newKey]) => ({
        source,
        has: [{ type: "query" as const, key, value: "(?<value>.*)" }],
        destination: `${destination}?${newKey}=:value`,
        permanent: true,
      })),
      ...RENAMED.map(([source, destination]) => ({ source, destination, permanent: true })),
    ]);
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
