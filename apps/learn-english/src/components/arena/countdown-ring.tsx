"use client";

import { cn } from "@/lib/utils";
import { useCountdown } from "./use-countdown";

const RADIUS = 26;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

interface CountdownRingProps {
  deadline: number | null;
  offset: number;
  /** The whole span, for how full the ring is. */
  totalMs: number;
  label: string;
  className?: string;
}

/** Seconds left in a ring that empties (the Ready window, the reconnect wait). Only this re-renders as time runs. */
export function CountdownRing({ deadline, offset, totalMs, label, className }: CountdownRingProps) {
  const left = useCountdown(deadline, offset);
  const seconds = Math.ceil(left / 1_000);
  const share = totalMs > 0 ? Math.min(1, left / totalMs) : 0;
  return (
    <div role="timer" aria-label={`${label}: còn ${seconds} giây`} className={cn("relative grid size-16 place-items-center", className)}>
      <svg viewBox="0 0 60 60" className="absolute inset-0 -rotate-90" aria-hidden>
        <circle cx="30" cy="30" r={RADIUS} fill="none" strokeWidth="5" className="stroke-muted" />
        <circle
          cx="30"
          cy="30"
          r={RADIUS}
          fill="none"
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={CIRCUMFERENCE * (1 - share)}
          className={cn("transition-[stroke-dashoffset] duration-200 ease-linear", seconds <= 5 ? "stroke-warning" : "stroke-primary")}
        />
      </svg>
      <span aria-hidden className="text-lg font-bold tabular-nums">
        {seconds}
      </span>
    </div>
  );
}
