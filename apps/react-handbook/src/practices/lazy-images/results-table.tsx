"use client";

import { useId } from "react";

import type { MetricsSnapshot } from "./run-metrics";
import { STRATEGIES, STRATEGY_LABEL, type GallerySettings, type ResultRow, type Run, type Strategy } from "./run";
import { formatKb, formatReady, formatShift, useMetrics } from "./run-counters";

function settingsSummary(s: GallerySettings) {
  const parts = [`${s.count} photos`, s.placeholder, s.reserve ? "reserved" : "no reserve", `${s.priority} priority`];
  if (s.strategy === "hand-built") parts.push(`${s.preloadPx} px band`, s.delayMs ? `${s.delayMs} ms delay` : "no delay");
  return parts.join(", ");
}

function Row({ label, settings, m, current }: { label: string; settings: GallerySettings; m: MetricsSnapshot; current: boolean }) {
  return (
    <tr className="border-t">
      <th scope="row" className="py-1.5 pr-3 text-left font-medium whitespace-nowrap text-foreground">
        {label}
        {current ? <span className="ml-1 font-normal text-muted-foreground">(current)</span> : null}
      </th>
      <td className="px-2 text-right">{m.server?.requests ?? "…"}</td>
      <td className="px-2 text-right">{m.server ? formatKb(m.server.bytes) : "…"}</td>
      <td className="px-2 text-right">{m.server?.cancelled ?? "…"}</td>
      <td className="px-2 text-right">{settings.strategy === "hand-built" ? m.skipped : "—"}</td>
      <td className="px-2 text-right">{`${m.shown}/${m.total}`}</td>
      <td className="px-2 text-right">{formatReady(m)}</td>
      <td className="px-2 text-right">{formatShift(m)}</td>
      <td className="pl-2 text-left font-sans text-muted-foreground">{settingsSummary(settings)}</td>
    </tr>
  );
}

/** Latest finished run per strategy, next to the live current run. */
export function ResultsTable({ run, results }: { run: Run; results: Partial<Record<Strategy, ResultRow>> }) {
  const live = useMetrics(run.metrics);
  const captionId = useId();
  const current = run.settings.strategy;
  return (
    // Scrolls sideways on phones, so it must be focusable for keyboard users.
    <div
      tabIndex={0}
      role="region"
      aria-labelledby={captionId}
      className="relative min-w-0 overflow-x-auto rounded-lg border px-3 py-2 outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      <table className="w-full min-w-[44rem] font-mono text-xs tabular-nums">
        <caption id={captionId} className="mb-1 text-left font-sans text-sm font-medium text-foreground">
          Results: latest run of each strategy
        </caption>
        <thead className="font-sans text-muted-foreground">
          <tr>
            <th scope="col" className="py-1 pr-3 text-left font-medium">Strategy</th>
            <th scope="col" className="px-2 text-right font-medium">Requests</th>
            <th scope="col" className="px-2 text-right font-medium">Served</th>
            <th scope="col" className="px-2 text-right font-medium">Cancelled</th>
            <th scope="col" className="px-2 text-right font-medium">Skipped</th>
            <th scope="col" className="px-2 text-right font-medium">Shown</th>
            <th scope="col" className="px-2 text-right font-medium">Visible ready</th>
            <th scope="col" className="px-2 text-right font-medium">Layout shift</th>
            <th scope="col" className="pl-2 text-left font-medium">Settings</th>
          </tr>
        </thead>
        <tbody>
          {STRATEGIES.map(({ value }) => {
            if (value === current) {
              return <Row key={value} label={STRATEGY_LABEL[value]} settings={run.settings} m={live} current />;
            }
            const row = results[value];
            return row ? (
              <Row key={value} label={STRATEGY_LABEL[value]} settings={row.settings} m={row.metrics} current={false} />
            ) : (
              <tr key={value} className="border-t">
                <th scope="row" className="py-1.5 pr-3 text-left font-medium whitespace-nowrap text-foreground">{STRATEGY_LABEL[value]}</th>
                <td colSpan={8} className="px-2 font-sans text-muted-foreground">Not run yet: pick it above.</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
