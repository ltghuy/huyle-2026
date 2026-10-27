import "server-only";
import { getCloudflareContext } from "@opennextjs/cloudflare";

/**
 * Counts one failed sync-code lookup for the caller's IP and says whether it
 * must now wait (the `SYNC_LOOKUP_LIMITER` binding: 10 per 60 s per key). The
 * IP is only used as the limiter key, in memory; it is never stored.
 *
 * When the binding is missing or fails (some local setups), lookups are not
 * throttled rather than failing the request.
 */
export async function isLookupThrottled(request: Request): Promise<boolean> {
  const key = request.headers.get("cf-connecting-ip") ?? "unknown";
  try {
    const limiter = getCloudflareContext().env.SYNC_LOOKUP_LIMITER;
    if (!limiter) return false;
    const { success } = await limiter.limit({ key });
    return !success;
  } catch (error) {
    console.warn("Sync lookup limiter unavailable:", error);
    return false;
  }
}
