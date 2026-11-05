"use client";

import { Trophy, UserRound, X } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import type { ArenaMatch } from "@/server/arena/arena.schema";
import { cn } from "@/lib/utils";
import { PlayerAvatar } from "./players";

// Labels and pictures shared by the history list, its dialog and the hub card (feature 025).

/** Shared by the history page and the hub card, so they read the same response. */
export const ARENA_MATCHES_KEY = ["arena-matches"] as const;
export const MATCHES_STALE_MS = 30_000;

export const HISTORY_PATH = "/arena/history";

export const DELETED_PLAYER = "Người chơi đã xóa tài khoản";

/** "Thắng" or "Thua" (AC-003). */
export function resultLabel(match: Pick<ArenaMatch, "won">): string {
  return match.won ? "Thắng" : "Thua";
}

/** How a forfeit reads from the learner's side (AC-004), in the results screen's words. */
export function forfeitLabel(match: Pick<ArenaMatch, "won" | "forfeit">): string | null {
  if (!match.forfeit) return null;
  return match.won ? "Đối thủ rời trận" : "Bạn rời trận";
}

export function scoreLabel(match: Pick<ArenaMatch, "score">): string {
  return `${match.score.mine}–${match.score.theirs}`;
}

/** The opponent's picture, or a plain icon once they've deleted their account. */
export function OpponentAvatar({ match, className }: { match: ArenaMatch; className?: string }) {
  if (match.opponent) return <PlayerAvatar player={match.opponent} you={false} className={className} />;
  return (
    <Avatar className={cn("size-10", className)}>
      <AvatarFallback className="bg-muted text-muted-foreground">
        <UserRound aria-hidden className="size-5" />
      </AvatarFallback>
    </Avatar>
  );
}

/** Result as icon + word, so it never rests on color alone. */
export function ResultBadge({ match }: { match: ArenaMatch }) {
  const Icon = match.won ? Trophy : X;
  return (
    <Badge variant={match.won ? "default" : "secondary"} className="gap-1">
      <Icon aria-hidden />
      {resultLabel(match)}
    </Badge>
  );
}
