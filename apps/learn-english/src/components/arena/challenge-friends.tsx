"use client";

import { useEffect, useRef, useState } from "react";
import { Hourglass, Swords } from "lucide-react";
import { toast } from "sonner";
import { FriendAvatar } from "@/components/social/friends-list";
import { lastActive } from "@/components/social/last-active";
import { sortFriends, useSocial } from "@/components/social/use-social";
import { Button } from "@/components/ui/button";
import { CHALLENGE_MS, type DeliveryState } from "@/learning/arena/link";
import { ArenaError, cancelChallenge, sendChallenge } from "@/lib/arena-client";
import { link as defaultLink, type Link } from "@/lib/link-client";
import { cn } from "@/lib/utils";
import type { Friend } from "@/server/social/social.schema";
import { SecondsLeft } from "./seconds-left";

// "Thách đấu bạn bè" (feature 035): the host's friends under the players while a seat
// is free. An online friend gets a "Thách đấu" button; a pending challenge shows its
// seconds left and "Hủy". Every challenge ends in one message to the host (AC-005 to
// AC-009), and leaving the room or the seat filling withdraws the rest (AC-010).

interface Pending {
  name: string;
  deadline: number;
}

/** What the host hears when a challenge didn't reach the friend. */
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

interface ChallengeFriendsProps {
  code: string;
  /** The host's name as the room shows it. */
  hostName?: string;
  /** Players and spectators already in the room: no button for them. */
  inRoom: readonly string[];
  /** For tests. */
  client?: Link;
}

export function ChallengeFriends({ code, hostName, inRoom, client = defaultLink }: ChallengeFriendsProps) {
  const { query } = useSocial();
  const [pending, setPending] = useState<ReadonlyMap<string, Pending>>(new Map());
  const [sending, setSending] = useState<ReadonlySet<string>>(new Set());
  // The same challenges for the timers, the reply listener and the unmount cleanup.
  const pendingRef = useRef(new Map<string, Pending & { timer: ReturnType<typeof setTimeout> }>());

  function settle(friendId: string): Pending | null {
    const entry = pendingRef.current.get(friendId);
    if (!entry) return null;
    clearTimeout(entry.timer);
    pendingRef.current.delete(friendId);
    setPending(new Map(pendingRef.current));
    return entry;
  }

  // Replies arrive on this tab's link; one for no pending challenge (late, or forged) is ignored.
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
      for (const [friendId, entry] of open) {
        clearTimeout(entry.timer);
        cancelChallenge(code, friendId);
      }
      open.clear();
    };
  }, [code]);

  async function handleChallenge(friend: Friend) {
    setSending((current) => new Set(current).add(friend.id));
    try {
      const { state } = await sendChallenge(code, friend.id, hostName);
      if (state !== "sent") {
        toast(NOT_SENT[state](friend.name));
        return;
      }
      settle(friend.id);
      const timer = setTimeout(() => {
        if (settleRef.current(friend.id)) toast(REPLY_MESSAGES.expired(friend.name));
      }, CHALLENGE_MS);
      pendingRef.current.set(friend.id, { name: friend.name, deadline: Date.now() + CHALLENGE_MS, timer });
      setPending(new Map(pendingRef.current));
    } catch (error) {
      toast.error(error instanceof ArenaError ? error.message : "Không gửi được lời thách đấu. Bạn thử lại nhé.");
    } finally {
      setSending((current) => {
        const next = new Set(current);
        next.delete(friend.id);
        return next;
      });
    }
  }

  function handleCancel(friendId: string) {
    if (settle(friendId)) cancelChallenge(code, friendId);
  }

  const data = query.data;
  if (!data) return null;
  const friends = sortFriends(data.friends).filter((friend) => !inRoom.includes(friend.id));

  return (
    <section aria-labelledby="challenge-friends-title" className="grid gap-2">
      <h2 id="challenge-friends-title" className="text-sm font-medium text-muted-foreground">
        Thách đấu bạn bè
      </h2>
      {friends.length === 0 ? (
        <p className="rounded-xl border border-dashed px-3 py-3 text-sm text-muted-foreground">
          Bạn chưa có bạn bè nào để thách đấu. Sau mỗi trận, bạn có thể kết bạn với đối thủ.
        </p>
      ) : (
        <ul className="grid max-h-80 gap-2 overflow-y-auto">
          {friends.map((friend) => (
            <FriendChallengeRow
              key={friend.id}
              friend={friend}
              now={data.now}
              pending={pending.get(friend.id) ?? null}
              sending={sending.has(friend.id)}
              onChallenge={handleChallenge}
              onCancel={handleCancel}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

interface FriendChallengeRowProps {
  friend: Friend;
  now: number;
  pending: Pending | null;
  sending: boolean;
  onChallenge: (friend: Friend) => void;
  onCancel: (friendId: string) => void;
}

function FriendChallengeRow({ friend, now, pending, sending, onChallenge, onCancel }: FriendChallengeRowProps) {
  const status = friend.online ? "Đang trực tuyến" : lastActive(friend.lastSeenAt, now);
  return (
    <li className="flex min-h-14 items-center gap-3 rounded-xl border bg-card px-3 py-2">
      <FriendAvatar friend={friend} />
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold">{friend.name}</p>
        <p className={cn("truncate text-xs", friend.online ? "text-success" : "text-muted-foreground")}>{status}</p>
      </div>
      {pending ? (
        <>
          <span role="status" className="flex items-center gap-1 text-sm text-muted-foreground">
            <Hourglass aria-hidden className="size-4" /> Đang chờ · <SecondsLeft deadline={pending.deadline} />
          </span>
          <Button variant="ghost" className="h-11" onClick={() => onCancel(friend.id)} aria-label={`Hủy lời thách đấu ${friend.name}`}>
            Hủy
          </Button>
        </>
      ) : friend.online ? (
        <Button variant="outline" className="h-11 gap-1.5" disabled={sending} onClick={() => onChallenge(friend)} aria-label={`Thách đấu ${friend.name}`}>
          <Swords aria-hidden /> Thách đấu
        </Button>
      ) : null}
    </li>
  );
}
