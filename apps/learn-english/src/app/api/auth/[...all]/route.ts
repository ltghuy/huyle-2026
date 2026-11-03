import { jsonError } from "@/lib/http";
import { getAuth } from "@/server/auth/auth";
import { SIGN_IN_UNAVAILABLE } from "@/server/auth/session";
import { isSignInThrottled } from "@/server/auth/throttle";

// Google sign-in (feature 022): Better Auth's endpoints (sign-in/social, callback/google,
// get-session, sign-out). The instance is built per request, so `toNextJsHandler`, which wants
// one at module scope, isn't used.

const TOO_MANY = "Bạn thử đăng nhập nhiều lần quá. Đợi một phút rồi thử lại nhé.";

async function handle(request: Request): Promise<Response> {
  if (await isSignInThrottled(request)) return jsonError(TOO_MANY, 429);
  let auth;
  try {
    auth = getAuth();
  } catch (error) {
    console.error("Sign-in unavailable:", error);
    return jsonError(SIGN_IN_UNAVAILABLE, 503);
  }
  return auth.handler(request);
}

export const GET = handle;
export const POST = handle;
