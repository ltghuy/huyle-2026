"use client";

import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Simulated: one clock drives three copies of the same text, each following
// its font-display rule. Browsers block for about 3 s with `block`, about
// 100 ms with `swap` and `optional`; `optional` then gives up on the font
// for this page view if it isn't there yet.
const BLOCK_PERIOD = 3000;
const OPTIONAL_WINDOW = 100;

const ARRIVALS = [
  { ms: 80, label: "80 ms (cached)" },
  { ms: 1500, label: "1.5 s" },
  { ms: 4000, label: "4 s (slow network)" },
];

type Look = "invisible" | "fallback" | "web";
type Mode = "block" | "swap" | "optional";

const MODES: { mode: Mode; summary: string }[] = [
  { mode: "block", summary: "Hide text up to 3 s, then fallback, then swap." },
  { mode: "swap", summary: "Fallback at once, swap when the font arrives." },
  { mode: "optional", summary: "Use the font only if it's there almost at once." },
];

const LOOK_TEXT: Record<Look, string> = {
  invisible: "Invisible: waiting for the font",
  fallback: "Fallback font (Georgia)",
  web: "Web font",
};

function look(mode: Mode, t: number, arrival: number): Look {
  if (mode === "block") return t >= arrival ? "web" : t < BLOCK_PERIOD ? "invisible" : "fallback";
  if (mode === "swap") return t >= arrival ? "web" : t < OPTIONAL_WINDOW ? "invisible" : "fallback";
  if (arrival <= OPTIONAL_WINDOW) return t >= arrival ? "web" : "invisible";
  return t < OPTIONAL_WINDOW ? "invisible" : "fallback";
}

/** Calls onTick with the elapsed ms about ten times a second until `until`. */
function startClock(until: number, onTick: (elapsed: number) => void) {
  const start = performance.now();
  const id = window.setInterval(() => {
    const elapsed = Math.min(until, performance.now() - start);
    onTick(elapsed);
    if (elapsed >= until) window.clearInterval(id);
  }, 50);
  return () => window.clearInterval(id);
}

export function FontDisplayDemo() {
  const [arrival, setArrival] = useState(1500);
  const [elapsed, setElapsed] = useState<number | null>(null);
  const stop = useRef<(() => void) | null>(null);
  const until = Math.max(arrival, BLOCK_PERIOD) + 800;
  const running = elapsed !== null && elapsed < until;

  useEffect(() => () => stop.current?.(), []);

  function handlePlay() {
    stop.current?.();
    setElapsed(0);
    stop.current = startClock(until, setElapsed);
  }

  function handleArrival(ms: number) {
    stop.current?.();
    setArrival(ms);
    setElapsed(null);
  }

  const t = elapsed ?? 0;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <fieldset className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
          <legend className="sr-only">The web font arrives after</legend>
          <span aria-hidden className="text-muted-foreground">Font arrives after</span>
          {ARRIVALS.map((option) => (
            <label key={option.ms} className="flex cursor-pointer items-center gap-1.5">
              <input
                type="radio"
                name="font-arrival"
                checked={arrival === option.ms}
                onChange={() => handleArrival(option.ms)}
                className="size-4 accent-primary"
              />
              {option.label}
            </label>
          ))}
        </fieldset>
        <Button size="sm" className="ml-auto" onClick={handlePlay} disabled={running}>
          {elapsed === null ? "Load page" : running ? "Loading…" : "Load again"}
        </Button>
      </div>

      <div aria-hidden className="relative h-2 rounded-full bg-muted">
        <span className="absolute inset-y-0 left-0 rounded-full bg-primary/70" style={{ width: `${(t / until) * 100}%` }} />
        <span className="absolute -top-1 h-4 border-l-2 border-dashed border-foreground/70" style={{ left: `${(arrival / until) * 100}%` }} />
      </div>
      <p className="flex justify-between text-xs text-muted-foreground">
        <span className="font-mono tabular-nums">{(t / 1000).toFixed(1)} s</span>
        <span>Dashed line: the font arrives</span>
      </p>

      <ul className="grid gap-3 md:grid-cols-3">
        {MODES.map(({ mode, summary }) => {
          const state = elapsed === null ? null : look(mode, t, arrival);
          return (
            <li key={mode} className="flex min-w-0 flex-col gap-2 rounded-lg border p-3">
              <p className="flex items-baseline justify-between gap-2">
                <code className="font-mono text-sm font-semibold">font-display: {mode}</code>
              </p>
              <p className="text-xs text-foreground/75">{summary}</p>
              <p
                aria-hidden
                className={cn(
                  "min-h-16 rounded-md border border-dashed p-2 text-lg leading-snug",
                  state === "invisible" && "text-transparent",
                  state === "fallback" && "font-[Georgia,serif]",
                  state === "web" && "font-sans",
                  state === null && "text-muted-foreground",
                )}
              >
                The quick brown fox jumps over the lazy dog.
              </p>
              <p aria-live="polite" className="text-xs font-medium">
                {state === null ? "Press “Load page”" : LOOK_TEXT[state]}
              </p>
            </li>
          );
        })}
      </ul>
      <p className="text-xs text-muted-foreground">
        Simulated timing. With <code className="font-mono">optional</code> the font is still downloaded and cached, so the next page
        uses it. Swapping fonts can shift the layout; matching the fallback&apos;s size with <code className="font-mono">size-adjust</code>{" "}
        keeps the shift small.
      </p>
    </div>
  );
}
