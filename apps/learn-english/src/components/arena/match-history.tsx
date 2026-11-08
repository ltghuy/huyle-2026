"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Swords } from "lucide-react";
import { Mascot } from "@/components/mascot/mascot";
import { Button, buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
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

/** The signed-in learner's newest matches (feature 025, AC-003, AC-006, AC-008). */
export function MatchHistory() {
  const history = useQuery({ queryKey: ARENA_MATCHES_KEY, queryFn: fetchArenaMatches, staleTime: MATCHES_STALE_MS });

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
    <div className="grid gap-3">
      <p className="text-sm text-muted-foreground tabular-nums">
        {stats.wins} thắng · {stats.losses} thua · {matches.length} trận gần nhất
      </p>
      <ol aria-label="Các trận gần đây" className="grid gap-2">
        {matches.map((match) => (
          <MatchRow key={match.id} match={match} />
        ))}
      </ol>
    </div>
  );
}
