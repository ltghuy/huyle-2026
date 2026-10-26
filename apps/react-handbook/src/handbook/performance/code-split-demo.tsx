"use client";

import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";

/** Stands in for a slow network; shown separately from the real, measured load. */
const SIMULATED_DELAY = 600;

type ReportModule = typeof import("./heavy-report");
type ChunkStats = { files: number; bytes: number; ms: number; fromCache: boolean };
type Pending = { startedAt: number; prefetched: boolean; promise: Promise<{ mod: ReportModule; chunk: ChunkStats | null }> };
type Stats = { waited: number; total: number; prefetched: boolean; chunk: ChunkStats | null };

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** The script files the browser fetched since `since`, from its resource timing. */
function scriptsSince(since: number): ChunkStats | null {
  const entries = (performance.getEntriesByType("resource") as PerformanceResourceTiming[]).filter(
    (e) => e.startTime >= since && (e.initiatorType === "script" || /\.js(\?|$)/.test(e.name)),
  );
  if (entries.length === 0) return null;
  const transferred = entries.reduce((sum, e) => sum + e.transferSize, 0);
  return {
    files: entries.length,
    bytes: transferred || entries.reduce((sum, e) => sum + e.encodedBodySize, 0),
    ms: Math.max(...entries.map((e) => e.responseEnd)) - Math.min(...entries.map((e) => e.startTime)),
    fromCache: transferred === 0,
  };
}

function beginLoad(prefetched: boolean): Pending {
  const startedAt = performance.now();
  const promise = Promise.all([import("./heavy-report"), delay(SIMULATED_DELAY)]).then(([mod]) => ({
    mod,
    chunk: scriptsSince(startedAt - 1),
  }));
  return { startedAt, prefetched, promise };
}

async function finishLoad(pending: Pending) {
  const clickedAt = performance.now();
  const { mod, chunk } = await pending.promise;
  const now = performance.now();
  return { mod, stats: { waited: now - clickedAt, total: now - pending.startedAt, prefetched: pending.prefetched, chunk } };
}

const formatKb = (bytes: number) => `${(bytes / 1024).toFixed(1)} KB`;

export function CodeSplitDemo() {
  const [prefetch, setPrefetch] = useState(true);
  const [phase, setPhase] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [Report, setReport] = useState<ReportModule["SalesReport"] | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const pending = useRef<Pending | null>(null);

  function handleIntent() {
    if (prefetch && !pending.current && phase === "idle") pending.current = beginLoad(true);
  }

  async function handleOpen() {
    pending.current ??= beginLoad(false);
    setPhase("loading");
    try {
      const { mod, stats: next } = await finishLoad(pending.current);
      setReport(() => mod.SalesReport);
      setStats(next);
      setPhase("ready");
    } catch {
      pending.current = null;
      setPhase("error");
    }
  }

  function handleReset() {
    pending.current = null;
    setReport(null);
    setStats(null);
    setPhase("idle");
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <input type="checkbox" checked={prefetch} onChange={(e) => setPrefetch(e.target.checked)} className="size-4 accent-primary" />
          Prefetch on hover or focus
        </label>
        <div className="ml-auto flex gap-2">
          <Button size="sm" onPointerEnter={handleIntent} onFocus={handleIntent} onClick={handleOpen} disabled={phase === "loading" || phase === "ready"}>
            {phase === "loading" ? "Loading…" : "Open sales report"}
          </Button>
          <Button variant="outline" size="sm" onClick={handleReset} disabled={phase === "idle"}>
            Reset
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-[1fr_16rem]">
        <div className="flex min-h-40 min-w-0 items-center justify-center rounded-lg border p-4">
          {phase === "ready" && Report ? (
            <Report />
          ) : phase === "error" ? (
            <p role="alert" className="text-sm text-destructive">
              The report&apos;s code failed to load. Try again.
            </p>
          ) : (
            <p className="text-center text-sm text-muted-foreground">
              {phase === "loading" ? "Loading the report's code…" : "The report's code isn't loaded yet."}
            </p>
          )}
        </div>

        <div className="grid content-start gap-2 text-sm">
          <dl aria-live="polite" className="grid gap-2">
          <div className="rounded-lg border p-3">
            <dt className="text-xs text-muted-foreground">You waited after clicking</dt>
            <dd className="font-mono text-lg font-semibold tabular-nums">{stats ? `${Math.round(stats.waited)} ms` : "—"}</dd>
            {stats?.prefetched ? (
              <dd className="text-xs text-success">Prefetch saved {Math.max(0, Math.round(stats.total - stats.waited))} ms</dd>
            ) : null}
          </div>
          <div className="rounded-lg border p-3">
            <dt className="text-xs text-muted-foreground">Real chunk download (measured)</dt>
            <dd className="font-mono tabular-nums">
              {!stats
                ? "—"
                : stats.chunk
                  ? `${stats.chunk.files} file${stats.chunk.files > 1 ? "s" : ""}, ${formatKb(stats.chunk.bytes)}${stats.chunk.fromCache ? " (HTTP cache)" : ""}, ${Math.round(stats.chunk.ms)} ms`
                  : "Already in memory: the browser keeps a loaded module, only the simulated delay applies"}
            </dd>
          </div>
          </dl>
          <p className="text-xs text-muted-foreground">Includes a simulated {SIMULATED_DELAY} ms network delay so the effect is visible on a fast connection. This chunk is tiny; a chart or editor library is often 100 KB or more.</p>
        </div>
      </div>
    </div>
  );
}
