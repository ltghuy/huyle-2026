"use client";

import type { ReactNode } from "react";
import { Hourglass, Swords } from "lucide-react";
import { FriendAvatar } from "@/components/social/friends-list";
import { lastActive } from "@/components/social/last-active";
import { sortFriends, useSocial } from "@/components/social/use-social";
import { Button } from "@/components/ui/button";
import type { Link } from "@/lib/link-client";
import { cn } from "@/lib/utils";
import { SecondsLeft } from "./seconds-left";
import { useChallenges, type Pending } from "./use-challenges";

// "Thách đấu bạn bè" (feature 035): the host's friends under the players while a seat
// is free. An online friend gets a "Thách đấu" button; a pending challenge shows its
// seconds left and "Hủy". Every challenge ends in one message to the host (AC-005 to
// AC-009), and leaving the room or the seat filling withdraws the rest (AC-010).

export { NOT_SENT, REPLY_MESSAGES } from "./use-challenges";

interface ChallengeFriendsProps {
  code: string;
  /** The host's name as the room shows it. */
  hostName?: string;
  /** Players and spectators already in the room: no button for them. */
  inRoom: readonly string[];
  /** For tests. */
  client?: Link;
}

export function ChallengeFriends({ code, hostName, inRoom, client }: ChallengeFriendsProps) {
  const { query } = useSocial();
  const challenges = useChallenges({ code, hostName, client });

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
            <InviteRow
              key={friend.id}
              name={friend.name}
              avatar={<FriendAvatar friend={friend} />}
              online={friend.online}
              status={friend.online ? "Đang trực tuyến" : lastActive(friend.lastSeenAt, data.now)}
              pending={challenges.pending.get(friend.id) ?? null}
              sending={challenges.sending.has(friend.id)}
              action={{ label: "Thách đấu", icon: <Swords aria-hidden />, aria: `Thách đấu ${friend.name}`, cancelAria: `Hủy lời thách đấu ${friend.name}` }}
              onInvite={() => challenges.challenge(friend)}
              onCancel={() => challenges.cancel(friend.id)}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

export interface InviteRowProps {
  name: string;
  avatar: ReactNode;
  /** Online learners get the action button; others only their last-active line. */
  online: boolean;
  status: string;
  /** A small mark after the name, such as "Bạn bè" (feature 045). */
  tag?: ReactNode;
  pending: Pending | null;
  sending: boolean;
  action: { label: string; icon: ReactNode; aria: string; cancelAria: string };
  onInvite: () => void;
  onCancel: () => void;
}

/** One person the host can challenge or invite, with the pending state (feature 035, reused by 045). */
export function InviteRow({ name, avatar, online, status, tag, pending, sending, action, onInvite, onCancel }: InviteRowProps) {
  return (
    <li className="flex min-h-14 items-center gap-3 rounded-xl border bg-card px-3 py-2">
      {avatar}
      <div className="min-w-0 flex-1">
        <p className="flex min-w-0 items-center gap-2 font-semibold">
          <span className="truncate">{name}</span>
          {tag}
        </p>
        <p className={cn("truncate text-xs", online ? "text-success" : "text-muted-foreground")}>{status}</p>
      </div>
      {pending ? (
        <>
          <span role="status" className="flex items-center gap-1 text-sm text-muted-foreground">
            <Hourglass aria-hidden className="size-4" /> Đang chờ · <SecondsLeft deadline={pending.deadline} />
          </span>
          <Button variant="ghost" className="h-11" onClick={onCancel} aria-label={action.cancelAria}>
            Hủy
          </Button>
        </>
      ) : online ? (
        <Button variant="outline" className="h-11 gap-1.5" disabled={sending} onClick={onInvite} aria-label={action.aria}>
          {action.icon} {action.label}
        </Button>
      ) : null}
    </li>
  );
}
