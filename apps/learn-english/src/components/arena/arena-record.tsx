"use client";

import { useQuery } from "@tanstack/react-query";
import { Trophy } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchArenaStats } from "@/lib/arena-client";

export const ARENA_STATS_KEY = ["arena-stats"] as const;

/** The learner's record in one line ("12 thắng · 5 thua · Chuỗi thắng dài nhất 4"); nothing if it can't load. */
export function ArenaRecord() {
  const stats = useQuery({ queryKey: ARENA_STATS_KEY, queryFn: fetchArenaStats, staleTime: 60_000 });
  if (stats.isPending) return <Skeleton className="h-5 w-64" />;
  if (!stats.data) return null;
  const { wins, losses, bestStreak } = stats.data;
  if (wins + losses === 0) return <p className="text-sm text-muted-foreground">Bạn chưa đấu trận nào. Tạo phòng và mời một người bạn nhé!</p>;
  return (
    <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
      <Trophy aria-hidden className="size-4 text-primary" />
      <span className="font-semibold tabular-nums">{wins} thắng</span>
      <span aria-hidden className="text-muted-foreground">·</span>
      <span className="tabular-nums">{losses} thua</span>
      <span aria-hidden className="text-muted-foreground">·</span>
      <span className="tabular-nums">Chuỗi thắng dài nhất {bestStreak}</span>
    </p>
  );
}
