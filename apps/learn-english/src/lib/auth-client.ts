// The browser side of Google sign-in (feature 022): plain fetch calls to the three Better Auth
// endpoints the app uses, so no auth library reaches the client bundle.

const AUTH = "/api/auth";

/** The signed-in learner as the session reports them. */
export interface SessionAccount {
  userId: string;
  name: string;
  email: string;
  image: string | null;
  /** Shows the "Quản trị" link (feature 038); the admin routes check it again themselves. */
  isAdmin?: boolean;
}

/** Thrown when the session can't be read (offline, server down); a guest is `null`, not an error. */
export class SessionUnavailableError extends Error {
  constructor(cause?: unknown) {
    super("Session unavailable", { cause });
    this.name = "SessionUnavailableError";
  }
}

/** The learner signed in on this browser, or null for a guest. */
export async function fetchSession(): Promise<SessionAccount | null> {
  let response: Response;
  try {
    response = await fetch(`${AUTH}/get-session`, { cache: "no-store", credentials: "same-origin" });
  } catch (cause) {
    throw new SessionUnavailableError(cause);
  }
  if (!response.ok) throw new SessionUnavailableError(response.status);
  const body = (await response.json()) as { user?: { id: string; name: string; email: string; image?: string | null; isAdmin?: boolean } } | null;
  if (!body?.user) return null;
  const { id, name, email, image, isAdmin } = body.user;
  return { userId: id, name, email, image: image ?? null, ...(isAdmin ? { isAdmin: true } : {}) };
}

/** The query parameter Better Auth adds to the page it returns to when sign-in fails or is cancelled. */
export const SIGN_IN_ERROR_PARAM = "error";

/** The server answered but couldn't start a sign-in (e.g. 503 while sign-in isn't configured). */
export class SignInUnavailableError extends Error {
  constructor(readonly status: number) {
    super(`Sign-in unavailable: ${status}`);
    this.name = "SignInUnavailableError";
  }
}

/**
 * Sends the learner to Google's account chooser and back to `returnTo` (a path on this site,
 * AC-012). Failing or cancelling comes back to the same page with `?error=…` (AC-003).
 */
export async function signInWithGoogle(returnTo: string): Promise<void> {
  const response = await fetch(`${AUTH}/sign-in/social`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify({ provider: "google", callbackURL: returnTo, errorCallbackURL: returnTo }),
  });
  if (!response.ok) throw new SignInUnavailableError(response.status);
  const { url } = (await response.json()) as { url?: string };
  if (!url) throw new Error("Sign-in failed: no redirect");
  window.location.assign(url);
}

/** Ends the session on the server; the caller clears the device. */
export async function signOutOfGoogle(): Promise<void> {
  await fetch(`${AUTH}/sign-out`, { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "same-origin", body: "{}" });
}
