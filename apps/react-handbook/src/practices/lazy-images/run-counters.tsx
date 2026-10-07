"use client";

import { useSyncExternalStore } from "react";

import type { MetricsSnapshot, RunMetrics } from "./run-metrics";

export function useMetrics(metrics: RunMetrics): MetricsSnapshot {
  return useSyncExternalStore(metrics.subscribe, metrics.getSnapshot, metrics.getSnapshot);
}

export const formatKb = (bytes: number) => `${(bytes / 1024).toFixed(0)} KB`;

export function formatReady(m: MetricsSnapshot) {
  if (m.visibleFailed) return "failed";
  return m.visibleReadyMs === null ? "…" : `${m.visibleReadyMs} ms`;
}

export function formatShift(m: MetricsSnapshot) {
  return m.layoutShift === null ? "n/a" : m.layoutShift.toFixed(3);
}

/** Live numbers for the current run. Server numbers are pushed as they change. */
export function RunCounters({ metrics, showSkipped }: { metrics: RunMetrics; showSkipped: boolean }) {
  const m = useMetrics(metrics);
  const server = m.server;
  const items: { label: string; value: string; title?: string }[] = [
    { label: "Requests", value: server ? String(server.requests) : "…", title: "Image requests the server received for this run" },
    { label: "Served", value: server ? formatKb(server.bytes) : "…", title: "Uncompressed image bytes the server sent" },
    { label: "Cancelled", value: server ? String(server.cancelled) : "…", title: "Requests the client dropped before the server answered" },
    { label: "Failed", value: server ? String(server.failed) : "…", title: "Requests that got the simulated server error" },
    ...(showSkipped ? [{ label: "Skipped", value: String(m.skipped), title: "Tiles that left the preload band before their start delay ended" }] : []),
    { label: "Shown", value: `${m.shown} / ${m.total}` },
    { label: "Visible ready", value: formatReady(m), title: `Time until the ${m.visibleCount} images visible at the start were shown` },
    { label: "Layout shift", value: formatShift(m), title: m.layoutShift === null ? "This browser doesn't report layout shifts" : "Sum of layout-shift scores inside the gallery; the browser only scores what is on screen, so keep the gallery in view" },
  ];

  return (
    <div className="flex flex-col gap-1">
      <dl className="grid grid-cols-2 gap-2 min-[420px]:grid-cols-4 lg:grid-cols-8">
        {items.map((item) => (
          <div key={item.label} title={item.title} className="min-w-0 rounded-md border px-2 py-1.5">
            <dt className="truncate text-[11px] font-medium text-muted-foreground">{item.label}</dt>
            <dd className="font-mono text-sm font-semibold text-foreground tabular-nums">{item.value}</dd>
          </div>
        ))}
      </dl>
      <p className="text-xs text-muted-foreground">
        {m.serverStale ? "Server numbers may be stale: the stats stream is reconnecting. " : null}
        Requests, bytes, cancelled and failed are counted by the server for this run only.
      </p>
      <p role="status" className="sr-only">
        {m.failed > 0
          ? `${m.failed === 1 ? "1 image" : `${m.failed} images`} couldn't load. Latest: ${m.lastFailure}.`
          : ""}
      </p>
    </div>
  );
}
