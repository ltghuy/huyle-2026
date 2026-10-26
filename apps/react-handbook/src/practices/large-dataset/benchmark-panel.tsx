"use client";

import { FlaskConical, Square, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

import { benchmarkResults, STEP_COUNT, useBenchmarkResults, type BenchmarkResult } from "./benchmark";
import { formatCount, formatMs } from "./format";
import { OPTIMIZATIONS } from "./optimization-panel";

export type BenchmarkState = { running: boolean; step: number; label: string };

type Column = {
  label: string;
  value: (r: BenchmarkResult) => number | null;
  format: (v: number) => string;
  /** Which end of the column is better. */
  better: "low" | "high";
};

const COLUMNS: Column[] = [
  { label: "Median render", value: (r) => r.medianRenderMs, format: formatMs, better: "low" },
  { label: "p95 render", value: (r) => r.p95RenderMs, format: formatMs, better: "low" },
  { label: "Worst typing delay", value: (r) => r.maxInputMs, format: formatMs, better: "low" },
  { label: "Long tasks", value: (r) => r.longTasks, format: formatCount, better: "low" },
  { label: "Blocking time", value: (r) => r.blockingMs, format: formatMs, better: "low" },
  { label: "Frame rate", value: (r) => r.fps, format: (v) => `${Math.round(v)} fps`, better: "high" },
  { label: "Rows per render", value: (r) => r.medianRowsRendered, format: formatCount, better: "low" },
];

function configName(r: BenchmarkResult) {
  const on = OPTIMIZATIONS.filter(({ key }) => r.config[key]);
  if (on.length === OPTIMIZATIONS.length) return "Optimized";
  if (on.length === 0) return "Naive";
  return `Only ${on.map((o) => o.title.toLowerCase()).join(", ")}`;
}

function best(results: BenchmarkResult[], column: Column) {
  const values = results.map(column.value).filter((v): v is number => v !== null);
  if (values.length < 2) return null;
  return column.better === "low" ? Math.min(...values) : Math.max(...values);
}

export function BenchmarkPanel({
  state,
  disabled,
  onRun,
  onStop,
}: {
  state: BenchmarkState;
  disabled: boolean;
  onRun: () => void;
  onStop: () => void;
}) {
  const results = useBenchmarkResults();
  const bests = COLUMNS.map((c) => best(results, c));
  const progress = state.running ? Math.round((state.step / STEP_COUNT) * 100) : 0;

  return (
    <section aria-labelledby="benchmark-heading" className="flex flex-col gap-3 border-t pt-4">
      <div className="flex flex-wrap items-center gap-2">
        <h3 id="benchmark-heading" className="flex items-center gap-2 text-sm font-semibold">
          <FlaskConical aria-hidden className="size-4 text-muted-foreground" /> Benchmark
        </h3>
        <p className="text-sm text-foreground/75">
          About 10 s: type and clear a filter, sort, select, scroll, then 3 s of live updates.
        </p>
        <div className="ml-auto flex gap-2">
          {state.running ? (
            <Button variant="outline" size="sm" onClick={onStop}>
              <Square aria-hidden /> Stop
            </Button>
          ) : (
            <Button size="sm" disabled={disabled} onClick={onRun}>Run benchmark</Button>
          )}
        </div>
      </div>

      {state.running ? (
        <div className="flex flex-col gap-1">
          <Progress value={progress} aria-label="Benchmark progress" />
          <p className="text-xs text-foreground/75" aria-live="polite">
            Step {state.step + 1} of {STEP_COUNT}: {state.label}
          </p>
        </div>
      ) : null}

      {results.length ? (
        <>
          <div className="relative overflow-x-auto rounded-lg border">
            <table className="w-full min-w-[48rem] text-xs">
              <caption className="sr-only">Benchmark results, newest last</caption>
              <thead className="bg-muted text-left">
                <tr>
                  <th scope="col" className="p-2 font-medium">Configuration</th>
                  <th scope="col" className="p-2 text-right font-medium">Rows</th>
                  {COLUMNS.map((c) => (
                    <th key={c.label} scope="col" className="p-2 text-right font-medium">{c.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {results.map((r) => (
                  <tr key={r.id} className="border-t">
                    <th scope="row" className="max-w-56 p-2 text-left font-medium">{configName(r)}</th>
                    <td className="p-2 text-right tabular-nums">{formatCount(r.rows)}</td>
                    {COLUMNS.map((c, i) => {
                      const v = c.value(r);
                      const isBest = v !== null && v === bests[i];
                      return (
                        <td key={c.label} className={cn("p-2 text-right font-mono tabular-nums", isBest && "font-semibold text-success")}>
                          {v === null ? "n/a" : c.format(v)}
                          {isBest ? <span className="ml-1 font-sans">best</span> : null}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-foreground/75">
            <span>Last {results.length} runs this session. Compare runs with the same row count.</span>
            <Button variant="ghost" size="xs" className="ml-auto" onClick={() => benchmarkResults.clear()}>
              <Trash2 aria-hidden /> Clear results
            </Button>
          </div>
        </>
      ) : (
        <p className="text-sm text-muted-foreground">
          No runs yet. Try “Naive”, then “Optimized”, with the same dataset.
        </p>
      )}
    </section>
  );
}

