import "server-only";
import { getCloudflareContext } from "@opennextjs/cloudflare";

/** SHA-256 hex of an entry's secret; only this is stored. */
export async function hashToken(token: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

/**
 * Counts one board write for the caller's IP and says whether it must wait
 * (the `LEADERBOARD_LIMITER` binding: 20 per 60 s per key). The IP is only the
 * limiter key, in memory; it is never stored. Without the binding (some local
 * setups) writes are not throttled rather than failing.
 */
export async function isWriteThrottled(request: Request): Promise<boolean> {
  const key = request.headers.get("cf-connecting-ip") ?? "unknown";
  try {
    const limiter = getCloudflareContext().env.LEADERBOARD_LIMITER;
    if (!limiter) return false;
    const { success } = await limiter.limit({ key });
    return !success;
  } catch (error) {
    console.warn("Leaderboard limiter unavailable:", error);
    return false;
  }
}
