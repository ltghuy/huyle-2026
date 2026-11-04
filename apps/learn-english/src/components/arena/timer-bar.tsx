"use client";

import { cn } from "@/lib/utils";
import { useCountdown } from "./use-countdown";

/** What the bar says to screen readers: only at 10 and 5 seconds, so it isn't read out every second. */
export function timeWarning(seconds: number): string {
  if (seconds > 0 && seconds <= 5) return "Còn 5 giây";
  if (seconds > 5 && seconds <= 10) return "Còn 10 giây";
  return "";
}

interface TimerBarProps {
  deadline: number | null;
  offset: number;
  totalMs: number;
}

/** The question's time draining away: accent, then amber under 5 s, red under 3 s (AC-012). Only this re-renders as it runs. */
export function TimerBar({ deadline, offset, totalMs }: TimerBarProps) {
  const left = useCountdown(deadline, offset, 100);
  const seconds = Math.ceil(left / 1_000);
  const share = totalMs > 0 ? Math.min(1, left / totalMs) : 0;
  const tone = seconds <= 3 ? "bg-destructive" : seconds <= 5 ? "bg-warning" : "bg-primary";
  return (
    <div className="flex items-center gap-3">
      <div aria-hidden className="h-2.5 flex-1 overflow-hidden rounded-full bg-muted">
        <div className={cn("h-full rounded-full transition-[width] duration-100 ease-linear", tone)} style={{ width: `${share * 100}%` }} />
      </div>
      <span aria-hidden className={cn("w-10 text-right text-sm font-bold tabular-nums", seconds <= 3 ? "text-destructive" : "text-muted-foreground")}>
        {seconds}s
      </span>
      <span className="sr-only" aria-live="polite">
        {timeWarning(seconds)}
      </span>
    </div>
  );
}
