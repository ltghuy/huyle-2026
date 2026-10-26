import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import staticAssetsIncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/static-assets-incremental-cache";

// Every page is prerendered and nothing revalidates, so serve pages and RSC
// payloads from the build output (Workers static assets) instead of
// re-rendering them on the Worker. The default "dummy" cache re-rendered every
// request, and bursts of sidebar prefetches hit the Worker resource limit (503s).
export default defineCloudflareConfig({
  incrementalCache: staticAssetsIncrementalCache,
  enableCacheInterception: true,
});
