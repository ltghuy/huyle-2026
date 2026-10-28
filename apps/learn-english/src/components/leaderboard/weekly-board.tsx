"use client";

import { useEffect, useState } from "react";
import { Trophy } from "lucide-react";
import { slideOffsets } from "@/learning/leaderboard";
import type { BoardResult } from "@/lib/leaderboard-client";
import { cn } from "@/lib/utils";

/** Row height (`h-14`, 3.5rem) plus the gap between rows (`gap-2`, 0.5rem): the distance one place moves. */
const ROW_STEP_REM = 4;
/** Pause before the slide starts, so the learner sees where they were. */
const SLIDE_DELAY_MS = 400;

function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;
}

function headline({ rank, previousRank, total }: BoardResult): string {
  const moved = previousRank - rank;
  if (moved > 0) return `Bạn lên hạng ${rank}, vượt qua ${moved} bạn!`;
  if (total === 1) return "Bạn là người đầu tiên trên bảng tuần này. Giữ vững nhé!";
  return `Bạn đang hạng ${rank} trong ${total} bạn. Học tiếp để lên hạng nhé!`;
}

/**
 * This week's board around the learner (AC-001–AC-004). When they moved up,
 * their row starts below the learners they just overtook and slides to its
 * new place while those rows move down one; with reduced motion it shows the
 * final board at once.
 */
export function WeeklyBoard({ result }: { result: BoardResult }) {
  const offsets = slideOffsets(result.rows, result.previousPoints);
  const moves = offsets.some((offset) => offset !== 0);
  const [settled, setSettled] = useState(() => !moves || prefersReducedMotion());

  useEffect(() => {
    if (settled) return;
    const timer = setTimeout(() => setSettled(true), SLIDE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [settled]);

  return (
    <div className="grid gap-4">
      <p className="flex items-center gap-2 text-base font-medium" role="status">
        <Trophy className="size-5 shrink-0 text-streak" aria-hidden />
        {headline(result)}
      </p>
      <ol className="grid gap-2" aria-label="Bảng xếp hạng tuần này">
        {result.rows.map((row, i) => (
          <li
            key={`${row.position}-${row.name}`}
            aria-current={row.me ? "true" : undefined}
            style={{ transform: settled ? undefined : `translateY(${offsets[i] * ROW_STEP_REM}rem)` }}
            className={cn(
              "relative flex h-14 items-center gap-3 rounded-xl border bg-card px-4 transition-transform duration-700 ease-out motion-reduce:transition-none",
              row.me && "z-10 border-primary bg-primary/10 font-semibold",
            )}
          >
            <span className="w-8 text-right text-muted-foreground tabular-nums">{row.me && !settled ? result.previousRank : row.position}</span>
            <span className="min-w-0 flex-1 truncate">
              {row.name}
              {row.me ? <span className="ml-1 text-sm font-normal text-muted-foreground">(bạn)</span> : null}
            </span>
            <span className="tabular-nums">{row.points} điểm</span>
          </li>
        ))}
      </ol>
      <p className="text-sm text-muted-foreground">Xếp theo điểm chuyên cần từ thứ Hai tuần này. Mỗi thứ Hai, mọi người bắt đầu lại từ 0.</p>
    </div>
  );
}
