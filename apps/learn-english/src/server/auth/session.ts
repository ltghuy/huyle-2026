import "server-only";
import { jsonError } from "@/lib/http";
import { getAuth } from "./auth";

/** The signed-in learner as the API routes see them. */
export interface SessionUser {
  id: string;
  name: string;
  email: string;
  image: string | null;
}

export const SIGN_IN_REQUIRED = "Bạn cần đăng nhập để tiếp tục.";
export const SIGN_IN_UNAVAILABLE = "Đăng nhập đang tạm thời gián đoạn. Bạn thử lại sau ít phút nhé.";

/**
 * The learner signed in on this request, or null for a guest (feature 022). The one seam every
 * locked route goes through, so the sign-in library can change without touching the routes.
 */
export async function getSessionUser(request: Request): Promise<SessionUser | null> {
  const result = await getAuth().api.getSession({ headers: request.headers });
  if (!result) return null;
  const { id, name, email, image } = result.user;
  return { id, name, email, image: image ?? null };
}

/** The signed-in learner, or a Vietnamese 401 for guests (503 when sign-in itself can't run). */
export async function requireUser(request: Request): Promise<{ user: SessionUser } | { response: Response }> {
  try {
    const user = await getSessionUser(request);
    return user ? { user } : { response: jsonError(SIGN_IN_REQUIRED, 401) };
  } catch (error) {
    console.error("Session check failed:", error);
    return { response: jsonError(SIGN_IN_UNAVAILABLE, 503) };
  }
}
