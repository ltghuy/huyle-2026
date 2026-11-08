"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Flame, Swords, Trophy, X, type LucideIcon } from "lucide-react";
import { ARENA_STATS_KEY } from "@/components/arena/arena-record";
import { Mascot } from "@/components/mascot/mascot";
import { Button, buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchArenaStats } from "@/lib/arena-client";

function Stat({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: number }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border bg-card p-3 sm:p-4">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary sm:size-10">
        <Icon className="size-4 sm:size-5" aria-hidden />
      </span>
      <div className="min-w-0">
        <dt className="text-xs text-muted-foreground sm:text-sm">{label}</dt>
        <dd className="text-2xl font-semibold tabular-nums">{value}</dd>
      </div>
    </div>
  );
}

/** The learner's Arena record on Hồ sơ (feature 023, AC-030): wins, losses, the longest run of wins, or an invite. */
export function ArenaStats() {
  const stats = useQuery({ queryKey: ARENA_STATS_KEY, queryFn: fetchArenaStats, staleTime: 60_000 });

  function handleRetry() {
    void stats.refetch();
  }

  if (stats.isPending) {
    return (
      <div className="grid grid-cols-2 gap-3 px-4 sm:grid-cols-4 md:px-8" aria-busy="true" aria-label="Đang tải">
        {Array.from({ length: 3 }, (_, i) => (
          <Skeleton key={i} className="h-20 rounded-xl" />
        ))}
      </div>
    );
  }

  if (stats.isError) {
    return (
      <div className="flex flex-wrap items-center gap-3 px-4 text-sm text-muted-foreground md:px-8">
        Chưa tải được thành tích Đấu trường.
        <Button variant="outline" size="sm" onClick={handleRetry}>
          Thử lại
        </Button>
      </div>
    );
  }

  const { wins, losses, streak, bestStreak } = stats.data;
  if (wins + losses === 0) {
    return (
      <div className="mx-4 flex flex-wrap items-center gap-4 rounded-xl border border-dashed p-4 md:mx-8">
        <Mascot mood="cheer" size={56} />
        <p className="min-w-0 flex-1 text-muted-foreground">Bạn chưa đấu trận nào. Thách một người bạn: ai trả lời đúng trước thì ghi điểm.</p>
        <Link href="/arena" className={buttonVariants({ className: "h-11 gap-2" })}>
          <Swords aria-hidden /> Vào Đấu trường
        </Link>
      </div>
    );
  }

  return (
    <dl className="grid grid-cols-2 gap-3 px-4 sm:grid-cols-4 md:px-8">
      <Stat icon={Trophy} label="Thắng" value={wins} />
      <Stat icon={X} label="Thua" value={losses} />
      <Stat icon={Flame} label="Chuỗi thắng hiện tại" value={streak} />
      <Stat icon={Swords} label="Chuỗi thắng dài nhất" value={bestStreak} />
    </dl>
  );
}
