"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import Link from "next/link";
import { Swords } from "lucide-react";
import { Mascot } from "@/components/mascot/mascot";
import { Button, buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { ArenaMatch, ArenaStatsResponse } from "@/server/arena/arena.schema";
import { fetchArenaMatches } from "@/lib/arena-client";
import { DUEL_PATH } from "./arena-hub";
import { ARENA_MATCHES_KEY, MATCHES_STALE_MS } from "./match-parts";
import { MatchRow } from "./match-row";

const LOADING = (
  <div className="grid gap-2" aria-busy="true" aria-label="Đang tải">
    {Array.from({ length: 4 }, (_, i) => (
      <Skeleton key={i} className="h-16 rounded-xl" />
    ))}
  </div>
);

/** The signed-in learner's newest matches (feature 025, AC-003, AC-006, AC-008), by kind in tabs (feature 039, AC-052). */
export function MatchHistory() {
  const history = useQuery({ queryKey: ARENA_MATCHES_KEY, queryFn: fetchArenaMatches, staleTime: MATCHES_STALE_MS });
  const [tab, setTab] = useState<HistoryTab>("all");

  function handleTabChange(value: unknown) {
    if (value === "all" || value === "duel" || value === "team") setTab(value);
  }

  function handleRetry() {
    void history.refetch();
  }

  if (history.isPending) return LOADING;

  if (history.isError) {
    return (
      <div role="alert" className="flex flex-wrap items-center gap-3 rounded-xl border p-4 text-sm">
        <p className="min-w-0 flex-1">{history.error.message || "Chưa tải được lịch sử đấu."}</p>
        <Button variant="outline" className="h-11" onClick={handleRetry}>
          Thử lại
        </Button>
      </div>
    );
  }

  const { stats, matches } = history.data;
  if (matches.length === 0) {
    return (
      <div className="flex flex-wrap items-center gap-4 rounded-xl border border-dashed p-4">
        <Mascot mood="cheer" size={56} />
        <p className="min-w-0 flex-1 text-muted-foreground">
          {stats.wins + stats.losses > 0 ? "Các trận bạn đấu từ bây giờ sẽ được lưu ở đây." : "Bạn chưa đấu trận nào. Thách một người bạn, trận đầu tiên sẽ hiện ở đây."}
        </p>
        <Link href={DUEL_PATH} className={buttonVariants({ className: "h-11 gap-2" })}>
          <Swords aria-hidden /> Đấu 1-1 ngay
        </Link>
      </div>
    );
  }

  return (
    <Tabs value={tab} onValueChange={handleTabChange} className="grid gap-3">
      <TabsList aria-label="Loại trận" className="h-11 w-full sm:w-fit">
        {TABS.map(({ value, label }) => (
          <TabsTrigger key={value} value={value} className="h-9 px-3">
            {label}
          </TabsTrigger>
        ))}
      </TabsList>
      {TABS.map(({ value, empty }) => {
        const shown = matches.filter(KEEP[value]);
        return (
          <TabsContent key={value} value={value} className="grid gap-3">
            <p className="text-sm text-muted-foreground tabular-nums">{recordLine(value, stats, shown)}</p>
            {shown.length > 0 ? (
              <ol aria-label="Các trận gần đây" className="grid gap-2">
                {shown.map((match) => (
                  <MatchRow key={match.id} match={match} />
                ))}
              </ol>
            ) : (
              <p className="rounded-xl border border-dashed p-4 text-muted-foreground">{empty}</p>
            )}
          </TabsContent>
        );
      })}
    </Tabs>
  );
}

type HistoryTab = "all" | "duel" | "team";

const TABS: readonly { value: HistoryTab; label: string; empty: string }[] = [
  { value: "all", label: "Tất cả", empty: "Bạn chưa có trận nào được lưu." },
  { value: "duel", label: "Đấu 1-1", empty: "Bạn chưa có trận đấu 1-1 nào được lưu." },
  { value: "team", label: "Đấu đội", empty: "Bạn chưa có trận đấu đội nào được lưu." },
];

const KEEP: Record<HistoryTab, (match: ArenaMatch) => boolean> = {
  all: () => true,
  duel: (match) => !match.team,
  team: (match) => Boolean(match.team),
};

/**
 * The line above a tab's list (feature 039, AC-053): the Arena record (1-1 duels only) on "Tất cả"
 * and "Đấu 1-1", the listed team matches' wins, losses and draws on "Đấu đội".
 */
export function recordLine(tab: HistoryTab, stats: ArenaStatsResponse, shown: ArenaMatch[]): string {
  if (tab !== "team") return `${stats.wins} thắng · ${stats.losses} thua · ${shown.length} trận gần nhất`;
  const draws = shown.filter((m) => m.team?.draw).length;
  const wins = shown.filter((m) => m.won).length;
  return `${wins} thắng · ${shown.length - wins - draws} thua · ${draws} hòa`;
}
