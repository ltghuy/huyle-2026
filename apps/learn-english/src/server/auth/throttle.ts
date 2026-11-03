import "server-only";
import { getCloudflareContext } from "@opennextjs/cloudflare";

/** Paths under `/api/auth` that start or finish a Google round trip; reading the session isn't throttled. */
const THROTTLED = ["/api/auth/sign-in/", "/api/auth/callback/"];

/**
 * Counts one sign-in step for the caller's IP and says whether it must now wait (the
 * `AUTH_LIMITER` binding: 20 per 60 s per key). The IP is only the limiter key, never stored.
 * When the binding is missing or fails (some local setups), nothing is throttled.
 */
export async function isSignInThrottled(request: Request): Promise<boolean> {
  const { pathname } = new URL(request.url);
  if (!THROTTLED.some((prefix) => pathname.startsWith(prefix))) return false;
  const key = request.headers.get("cf-connecting-ip") ?? "unknown";
  try {
    const limiter = getCloudflareContext().env.AUTH_LIMITER;
    if (!limiter) return false;
    const { success } = await limiter.limit({ key });
    return !success;
  } catch (error) {
    console.warn("Sign-in limiter unavailable:", error);
    return false;
  }
}
