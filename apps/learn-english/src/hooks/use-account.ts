"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchSession, type SessionAccount } from "@/lib/auth-client";
import type { AccountLink } from "@/learning/types";
import { useProfile } from "./use-profile";

/**
 * - `unknown`: not known yet (first visit while the session loads)
 * - `guest`: not signed in
 * - `signed-in`: signed in, or offline with an account cached on this device (AC-017)
 * - `expired`: this device's account lost its session; progress stays and keeps working until
 *   the learner signs in again (AC-006)
 */
export type AccountStatus = "unknown" | "guest" | "signed-in" | "expired";

export interface AccountState {
  status: AccountStatus;
  /** The account to show: the live session's, else the one cached on this device. */
  account: SessionAccount | null;
  /** The live session, once it has been read (null for a guest); undefined while unknown or offline. */
  session: SessionAccount | null | undefined;
}

export const SESSION_QUERY_KEY = ["session"] as const;

/** Whether locked areas open for this state: signed in, or an expired session that keeps local progress. */
export function canUseLockedAreas(status: AccountStatus): boolean {
  return status === "signed-in" || status === "expired";
}

/** Pure, for tests: combines the session query with the account cached on this device. */
export function resolveAccount(
  cached: AccountLink | undefined,
  session: { status: "pending" | "success" | "error"; data?: SessionAccount | null },
  profileReady: boolean,
): AccountState {
  const fromCache = cached ? { userId: cached.userId, name: cached.name, email: cached.email, image: cached.image } : null;
  if (session.status === "success") {
    const live = session.data ?? null;
    if (live) return { status: "signed-in", account: live, session: live };
    // No session, but this device holds an account's progress: it ended elsewhere or expired.
    if (fromCache) return { status: "expired", account: fromCache, session: null };
    return { status: profileReady ? "guest" : "unknown", account: null, session: null };
  }
  if (fromCache) return { status: cached?.expired ? "expired" : "signed-in", account: fromCache, session: undefined };
  // Offline or the session can't be read: without a cached account this browser is a guest.
  if (session.status === "error" && profileReady) return { status: "guest", account: null, session: undefined };
  return { status: "unknown", account: null, session: undefined };
}

/** Who is using the app on this device (feature 022). Reads the session once per visit. */
export function useAccount(): AccountState {
  const profile = useProfile();
  const session = useQuery({ queryKey: SESSION_QUERY_KEY, queryFn: fetchSession, staleTime: 5 * 60_000, retry: false, refetchOnWindowFocus: false });
  const cached = profile.status === "ready" ? profile.data.account : undefined;
  return resolveAccount(cached, session, profile.status === "ready");
}
