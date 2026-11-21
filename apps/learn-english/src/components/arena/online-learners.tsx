"use client";

import { useQuery } from "@tanstack/react-query";
import { RefreshCw, UserPlus } from "lucide-react";
import { FriendAvatar } from "@/components/social/friends-list";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchOnline } from "@/lib/arena-client";
import type { Link } from "@/lib/link-client";
import { cn } from "@/lib/utils";
import type { OnlineLearner } from "@/server/arena/arena.schema";
import { InviteRow } from "./challenge-friends";
import { useChallenges, type Pending } from "./use-challenges";

// "Đang trực tuyến" (feature 045): in a room opened from Cộng đồng, the host sees every other
// learner online now and can invite them, friend or not. Loaded on open and on "Làm mới" only
// (AC-005); invites work exactly like friend challenges (AC-003, AC-004).

interface OnlineLearnersProps {
  code: string;
  /** The host's name as the room shows it. */
  hostName?: string;
  /** Players and spectators already in the room: not listed. */
  inRoom: readonly string[];
  /** A duel lists friends under "Thách đấu bạn bè", so it hides them here; a team room marks them (AC-002, AC-007). */
  friends: "hide" | "mark";
  /** For tests. */
  client?: Link;
}

export function OnlineLearners({ code, hostName, inRoom, friends, client }: OnlineLearnersProps) {
  const online = useQuery({
    queryKey: ["arena-online", code],
    queryFn: () => fetchOnline(code),
    // Only the host refreshes the list (AC-005): no refetch on focus, reconnect or a timer.
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: false,
  });
  const challenges = useChallenges({ code, hostName, client });

  function handleRefresh() {
    void online.refetch();
  }

  const learners = (online.data?.learners ?? []).filter((learner) => !inRoom.includes(learner.id) && !(friends === "hide" && learner.isFriend));

  return (
    <section aria-labelledby="online-learners-title" className="grid gap-2">
      <div className="flex items-center justify-between gap-2">
        <h2 id="online-learners-title" className="text-sm font-medium text-muted-foreground">
          Đang trực tuyến
        </h2>
        <Button variant="ghost" size="sm" className="h-9 gap-1.5" onClick={handleRefresh} disabled={online.isFetching}>
          <RefreshCw aria-hidden className={cn(online.isFetching && "animate-spin motion-reduce:animate-none")} />
          Làm mới
        </Button>
      </div>
      {online.isPending ? (
        <div className="grid gap-2" aria-busy="true" aria-label="Đang tải">
          <Skeleton className="h-14 rounded-xl" />
          <Skeleton className="h-14 rounded-xl" />
        </div>
      ) : online.isError ? (
        <p role="alert" className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-dashed px-3 py-2 text-sm text-muted-foreground">
          Chưa tải được danh sách người đang trực tuyến.
          <Button variant="outline" size="sm" className="h-9" onClick={handleRefresh}>
            Thử lại
          </Button>
        </p>
      ) : learners.length === 0 ? (
        <p className="rounded-xl border border-dashed px-3 py-3 text-sm text-muted-foreground">Chưa có ai khác đang trực tuyến.</p>
      ) : (
        <ul className="grid max-h-80 gap-2 overflow-y-auto">
          {learners.map((learner) => (
            <OnlineRow
              key={learner.id}
              learner={learner}
              markFriend={friends === "mark"}
              pending={challenges.pending.get(learner.id) ?? null}
              sending={challenges.sending.has(learner.id)}
              onInvite={challenges.challenge}
              onCancel={challenges.cancel}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

interface OnlineRowProps {
  learner: OnlineLearner;
  markFriend: boolean;
  pending: Pending | null;
  sending: boolean;
  onInvite: (learner: OnlineLearner) => void;
  onCancel: (learnerId: string) => void;
}

function OnlineRow({ learner, markFriend, pending, sending, onInvite, onCancel }: OnlineRowProps) {
  return (
    <InviteRow
      name={learner.name}
      avatar={<FriendAvatar friend={{ ...learner, online: true }} />}
      online
      status="Đang trực tuyến"
      tag={markFriend && learner.isFriend ? <Badge variant="secondary">Bạn bè</Badge> : null}
      pending={pending}
      sending={sending}
      action={{ label: "Mời", icon: <UserPlus aria-hidden />, aria: `Mời ${learner.name}`, cancelAria: `Hủy lời mời ${learner.name}` }}
      onInvite={() => onInvite(learner)}
      onCancel={() => onCancel(learner.id)}
    />
  );
}
