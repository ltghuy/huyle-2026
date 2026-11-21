"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { CHALLENGE_MS, type DeliveryState } from "@/learning/arena/link";
import { ArenaError, cancelChallenge, sendChallenge } from "@/lib/arena-client";
import { link as defaultLink, type Link } from "@/lib/link-client";

// The host's open challenges and invites from one waiting room list (feature 035, used by the
// friend list and, in feature 045, the online list). One pending challenge per learner; each ends
// in exactly one message to the host, and unmounting (the host left, the seat filled, the match
// started) withdraws the rest (035 AC-005 to AC-010, 045 AC-004, AC-009).

export interface Pending {
  name: string;
  deadline: number;
}

/** Who to challenge: a friend or, from Cộng đồng, any online learner. */
export interface ChallengeTarget {
  id: string;
  name: string;
}

/** What the host hears when a challenge didn't reach the learner. */
export const NOT_SENT: Record<Exclude<DeliveryState, "sent">, (name: string) => string> = {
  busy: (name) => `${name} đang ở một phòng đấu khác.`,
  offline: (name) => `${name} vừa rời đi nên chưa nhận được lời thách đấu.`,
  here: (name) => `${name} đã ở trong phòng này.`,
};

export const REPLY_MESSAGES = {
  accepted: (name: string) => `${name} đã nhận lời, đang vào phòng!`,
  declined: (name: string) => `${name} đã từ chối lời thách đấu.`,
  expired: (name: string) => `${name} chưa trả lời. Bạn có thể thách đấu lại.`,
} as const;

interface UseChallengesOptions {
  code: string;
  /** The host's name as the room shows it. */
  hostName?: string;
  client?: Link;
}

export interface Challenges {
  pending: ReadonlyMap<string, Pending>;
  sending: ReadonlySet<string>;
  challenge: (target: ChallengeTarget) => Promise<void>;
  cancel: (targetId: string) => void;
}

export function useChallenges({ code, hostName, client = defaultLink }: UseChallengesOptions): Challenges {
  const [pending, setPending] = useState<ReadonlyMap<string, Pending>>(new Map());
  const [sending, setSending] = useState<ReadonlySet<string>>(new Set());
  // The same challenges for the timers, the reply listener and the unmount cleanup.
  const pendingRef = useRef(new Map<string, Pending & { timer: ReturnType<typeof setTimeout> }>());

  function settle(targetId: string): Pending | null {
    const entry = pendingRef.current.get(targetId);
    if (!entry) return null;
    clearTimeout(entry.timer);
    pendingRef.current.delete(targetId);
    setPending(new Map(pendingRef.current));
    return entry;
  }

  // Replies arrive on this tab's link; one for no pending challenge (late, forged, or the other list's) is ignored.
  // A ref, so the effects below always call the latest render's `settle`.
  const settleRef = useRef(settle);
  useEffect(() => {
    settleRef.current = settle;
  });

  useEffect(() => {
    return client.subscribe((frame) => {
      if (frame.type !== "reply" || frame.code !== code) return;
      const entry = settleRef.current(frame.friendId);
      if (!entry) return;
      if (frame.accept) toast.success(REPLY_MESSAGES.accepted(entry.name));
      else toast(REPLY_MESSAGES.declined(entry.name));
    });
  }, [client, code]);

  useEffect(() => {
    const open = pendingRef.current;
    return () => {
      for (const [targetId, entry] of open) {
        clearTimeout(entry.timer);
        cancelChallenge(code, targetId);
      }
      open.clear();
    };
  }, [code]);

  async function challenge(target: ChallengeTarget) {
    setSending((current) => new Set(current).add(target.id));
    try {
      const { state } = await sendChallenge(code, target.id, hostName);
      if (state !== "sent") {
        toast(NOT_SENT[state](target.name));
        return;
      }
      settle(target.id);
      const timer = setTimeout(() => {
        if (settleRef.current(target.id)) toast(REPLY_MESSAGES.expired(target.name));
      }, CHALLENGE_MS);
      pendingRef.current.set(target.id, { name: target.name, deadline: Date.now() + CHALLENGE_MS, timer });
      setPending(new Map(pendingRef.current));
    } catch (error) {
      toast.error(error instanceof ArenaError ? error.message : "Không gửi được lời thách đấu. Bạn thử lại nhé.");
    } finally {
      setSending((current) => {
        const next = new Set(current);
        next.delete(target.id);
        return next;
      });
    }
  }

  function cancel(targetId: string) {
    if (settle(targetId)) cancelChallenge(code, targetId);
  }

  return { pending, sending, challenge, cancel };
}
