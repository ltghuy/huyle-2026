import "server-only";
import { getCloudflareContext } from "@opennextjs/cloudflare";

// The Workers Cache API (`caches.default`, the zone's edge cache). It exists in
// the deployed Worker and in `wrangler dev`/`cf:preview`, but not under
// `next dev` or Vitest, where callers fall back to reading D1 every time.
// Note: cache writes are silently dropped on `*.workers.dev` hostnames; they
// only stick on a custom domain such as english.huyle.work.
function edgeCache(): Cache | undefined {
  const storage = (globalThis as { caches?: CacheStorage & { default?: Cache } }).caches;
  return storage?.default;
}

export async function matchEdgeCache(key: string): Promise<Response | undefined> {
  try {
    return await edgeCache()?.match(key);
  } catch (error) {
    console.error("Edge cache read failed:", error);
    return undefined;
  }
}

/** Stores `response` under `key` after the response is sent (never blocks it). */
export function putEdgeCache(key: string, response: Response): void {
  const cache = edgeCache();
  if (!cache) return;
  const write = cache.put(key, response).catch((error: unknown) => {
    console.error("Edge cache write failed:", error);
  });
  try {
    getCloudflareContext().ctx.waitUntil(write);
  } catch {
    // No request context (tests): the write simply runs unawaited.
  }
}
