"use client";

import { Loader2, RotateCw, TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";

import { formatBytes, formatCount, formatMs } from "./format";
import type { GridSnapshot } from "./grid-controller";

/** Above the grid: what is happening right now (loading, updating, failed). */
export function GridStatus({ snapshot, onRetry }: { snapshot: GridSnapshot; onRetry: () => void }) {
  const { error, pending, datasetLoading, size } = snapshot;
  if (error) {
    return (
      <div role="alert" className="flex flex-wrap items-center gap-2 rounded-lg bg-destructive/5 px-3 py-2 text-sm">
        <TriangleAlert aria-hidden className="size-4 text-destructive" />
        <span className="flex-1 text-destructive">{error.replace(/\.?$/, ".")} The rows below are from the previous view.</span>
        <Button variant="outline" size="sm" onClick={onRetry}>
          <RotateCw aria-hidden />
          Retry
        </Button>
      </div>
    );
  }
  return (
    <p className="flex h-5 items-center gap-2 text-sm text-foreground/75">
      {pending ? (
        <>
          <Loader2 aria-hidden className="size-4 motion-safe:animate-spin" />
          {datasetLoading ? `Loading all ${formatCount(size)} employees…` : "Updating…"}
        </>
      ) : null}
    </p>
  );
}

/** Below the grid: the cost of the last view change and of the session. */
export function GridStats({ snapshot }: { snapshot: GridSnapshot }) {
  const { stats, dataset, requests, mode } = snapshot;
  return (
    <dl className="flex flex-wrap gap-x-4 gap-y-1 font-mono text-xs text-foreground/75 tabular-nums">
      <Stat label="Last change ran">{stats ? (stats.where === "browser" ? "in the browser" : "on the server") : "on the server (first paint)"}</Stat>
      {stats ? (
        <>
          <Stat label="took">{formatMs(stats.ms)}</Stat>
          <Stat label="matched">{formatCount(stats.matched)}</Stat>
          <Stat label="downloaded">{formatBytes(stats.bytes)}</Stat>
        </>
      ) : null}
      <Stat label="requests this session">{formatCount(requests)}</Stat>
      {mode === "browser" && dataset ? (
        <Stat label="dataset">{`${formatCount(dataset.size)} rows, ${formatBytes(dataset.bytes)}, downloaded once in ${formatMs(dataset.ms)}`}</Stat>
      ) : null}
    </dl>
  );
}

function Stat({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-1">
      <dt>{label}:</dt>
      <dd className="text-foreground">{children}</dd>
    </div>
  );
}
