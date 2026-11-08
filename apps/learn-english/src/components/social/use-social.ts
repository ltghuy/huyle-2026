"use client";

import { useQuery } from "@tanstack/react-query";
import { useAccount } from "@/hooks/use-account";
import { pulse } from "@/lib/social-client";
import { PULSE_MS, type Friend, type PulseResponse } from "@/server/social/social.schema";

// The signed-in learner's friends, request ids and unread count (feature 031). Every screen
// that needs them reads this one query, so a tab sends one pulse a minute however many of them
// are on screen. Guests send nothing (AC-018, AC-030).

export const SOCIAL_KEY = ["social"] as const;

export type Relation = "self" | "friends" | "sent" | "incoming" | "none";

/** Where the learner stands with `userId`, for the friend button (AC-001, AC-003, AC-007, AC-008). */
export function relationOf(data: Pick<PulseResponse, "friends" | "outgoing" | "incoming"> | undefined, me: string | undefined, userId: string): Relation {
  if (userId === me) return "self";
  if (!data) return "none";
  if (data.friends.some((friend) => friend.id === userId)) return "friends";
  if (data.outgoing.includes(userId)) return "sent";
  if (data.incoming.includes(userId)) return "incoming";
  return "none";
}

/** Online first, then the most recently active (AC-014). */
export function sortFriends(friends: Friend[]): Friend[] {
  return friends.toSorted((a, b) => Number(b.online) - Number(a.online) || (b.lastSeenAt ?? 0) - (a.lastSeenAt ?? 0) || a.name.localeCompare(b.name, "vi"));
}

export function useSocial() {
  const { status, account } = useAccount();
  const signedIn = status === "signed-in";
  const query = useQuery({
    queryKey: SOCIAL_KEY,
    queryFn: pulse,
    enabled: signedIn,
    refetchInterval: PULSE_MS,
    // Background tabs keep checking in: the app open in any tab counts as online (AC-012).
    refetchIntervalInBackground: true,
    retry: false,
  });
  return { signedIn, me: account?.userId, query };
}
