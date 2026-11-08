"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Check, UserCheck, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { sendFriendRequest, SocialError } from "@/lib/social-client";
import { cn } from "@/lib/utils";
import type { PulseResponse } from "@/server/social/social.schema";
import { relationOf, SOCIAL_KEY, useSocial } from "./use-social";

// "Kết bạn" on another learner's Arena card and in match history (feature 031, AC-001 to
// AC-003, AC-007, AC-008). It switches to "Đã gửi lời mời" at once and rolls back on failure.

const SEND_FAILED = "Chưa gửi được lời mời. Bạn thử lại nhé.";

function markSent(old: PulseResponse | undefined, userId: string): PulseResponse | undefined {
  return old && !old.outgoing.includes(userId) ? { ...old, outgoing: [...old.outgoing, userId] } : old;
}

export function FriendButton({ userId, className }: { userId: string; className?: string }) {
  const { signedIn, me, query } = useSocial();
  const queryClient = useQueryClient();
  const [sending, setSending] = useState(false);
  if (!signedIn) return null;
  const relation = relationOf(query.data, me, userId);
  if (relation === "self") return null;

  if (relation === "friends") {
    return (
      <span className={cn("inline-flex h-8 items-center gap-1.5 rounded-full bg-success/10 px-3 text-sm font-medium text-success", className)}>
        <UserCheck aria-hidden className="size-4" /> Bạn bè
      </span>
    );
  }
  if (relation === "sent") {
    return (
      <Button variant="ghost" size="sm" disabled className={cn("gap-1.5", className)}>
        <Check aria-hidden /> Đã gửi lời mời
      </Button>
    );
  }

  async function handleSend() {
    setSending(true);
    const previous = queryClient.getQueryData<PulseResponse>(SOCIAL_KEY);
    // A request back to someone who asked first makes friends at once (AC-008); wait for that.
    if (relation === "none") queryClient.setQueryData<PulseResponse>(SOCIAL_KEY, (old) => markSent(old, userId));
    try {
      const { state } = await sendFriendRequest(userId);
      if (state === "sent") queryClient.setQueryData<PulseResponse>(SOCIAL_KEY, (old) => markSent(old, userId));
      await queryClient.invalidateQueries({ queryKey: SOCIAL_KEY, exact: true });
    } catch (error) {
      queryClient.setQueryData(SOCIAL_KEY, previous);
      toast.error(error instanceof SocialError && error.status !== 503 && error.status !== 0 ? error.message : SEND_FAILED);
    } finally {
      setSending(false);
    }
  }

  return (
    <Button variant="outline" size="sm" disabled={sending} onClick={handleSend} className={cn("gap-1.5", className)}>
      <UserPlus aria-hidden /> Kết bạn
    </Button>
  );
}
