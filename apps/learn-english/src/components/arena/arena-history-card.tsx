"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight, History } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { canUseLockedAreas, useAccount } from "@/hooks/use-account";
import { fetchArenaMatches } from "@/lib/arena-client";
import { cn } from "@/lib/utils";
import { ARENA_MATCHES_KEY, DELETED_PLAYER, HISTORY_PATH, MATCHES_STALE_MS, resultLabel, scoreLabel } from "./match-parts";
import { teamResultLabel, teamScoreLabel } from "./match-details";
import { matchWhen } from "./match-when";
import type { ArenaMatch } from "@/server/arena/arena.schema";

/** "Thắng 2–1 · Lan" for a duel, "Đấu đội · Hòa · Đội A 1–1 Đội B" for a team match (feature 039). */
function latestLine(match: ArenaMatch): string {
  if (match.team) return `Đấu đội · ${teamResultLabel(match, match.team)} · ${teamScoreLabel(match, match.team)}`;
  return `${resultLabel(match)} ${scoreLabel(match)} · ${match.opponent?.name ?? DELETED_PLAYER}`;
}

const GUEST = "Đăng nhập để lưu lại các trận đã đấu: tỉ số, đối thủ và thời gian.";

/**
 * The hub's way into the history (feature 025, AC-009–AC-012): the record and the latest match
 * for a signed-in learner, an invitation for a guest. The whole card is one link.
 */
export function ArenaHistoryCard({ className }: { className?: string }) {
  const { status } = useAccount();
  const signedIn = canUseLockedAreas(status);
  const history = useQuery({ queryKey: ARENA_MATCHES_KEY, queryFn: fetchArenaMatches, staleTime: MATCHES_STALE_MS, enabled: signedIn });

  let summary: ReactNode;
  if (status === "unknown" || (signedIn && history.isPending)) summary = <Skeleton className="h-5 w-56 max-w-full" />;
  else if (!signedIn) summary = GUEST;
  else if (!history.data) summary = "Xem lại các trận bạn đã đấu.";
  else {
    const { stats, matches } = history.data;
    const latest = matches[0];
    summary = (
      <>
        {stats.wins + stats.losses > 0 ? (
          <span className="block font-semibold text-foreground tabular-nums">
            {stats.wins} thắng · {stats.losses} thua
          </span>
        ) : null}
        {latest ? (
          <span className="block">
            Trận gần nhất: {latestLine(latest)} · {matchWhen(latest.endedAt)}
          </span>
        ) : (
          <span className="block">Bạn chưa có trận nào được lưu. Đấu trận đầu tiên, nó sẽ hiện ở đây.</span>
        )}
      </>
    );
  }

  return (
    <Link
      href={HISTORY_PATH}
      aria-labelledby="arena-history-title"
      aria-describedby="arena-history-text"
      className={cn(
        "group relative isolate flex items-center gap-4 overflow-hidden rounded-2xl border bg-card p-5 outline-none transition-[transform,border-color,box-shadow] duration-200 hover:-translate-y-0.5 hover:border-primary/60 hover:shadow-lg hover:shadow-primary/10 focus-visible:ring-3 focus-visible:ring-ring/50 active:scale-[0.98] motion-reduce:transition-none motion-reduce:hover:translate-y-0 motion-reduce:active:scale-100 sm:p-6",
        className,
      )}
    >
      <span aria-hidden className="grid size-12 shrink-0 place-items-center rounded-xl bg-primary/15 text-primary">
        <History className="size-6" />
      </span>
      <span className="grid min-w-0 flex-1 gap-1">
        <span id="arena-history-title" className="text-lg font-bold">
          Lịch sử đấu
        </span>
        <span id="arena-history-text" className="text-sm text-muted-foreground">
          {summary}
        </span>
      </span>
      <ArrowRight aria-hidden className="size-5 shrink-0 text-primary transition-transform duration-200 group-hover:translate-x-1 motion-reduce:transition-none" />
    </Link>
  );
}
