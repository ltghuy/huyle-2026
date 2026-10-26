"use client";

import { Activity } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { formatCount, formatMs } from "./format";
import { resetMetrics, useMetrics } from "./metrics";

/** Amber text fails contrast on light backgrounds; darken it there (like practice 9's destructive text). */
const WARN_TEXT = "text-[color-mix(in_oklch,var(--warning),black_40%)] dark:text-warning";

/** Reads the metrics store on its own timer: never re-renders the board. */
export function MetricsPanel() {
  const m = useMetrics();
  const fps = m.fps === null ? "—" : `${Math.round(m.fps)} fps`;
  return (
    <section aria-labelledby="metrics-heading" className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <h3 id="metrics-heading" className="flex items-center gap-2 text-sm font-semibold">
          <Activity aria-hidden className="size-4 text-muted-foreground" /> Measurements
        </h3>
        <p className="text-xs text-foreground/75">
          Over-budget values are marked <span className={cn("font-medium", WARN_TEXT)}>slow</span>; development builds measure several times slower.
        </p>
        <Button variant="ghost" size="xs" className="ml-auto" onClick={resetMetrics}>Reset metrics</Button>
      </div>
      <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        <Metric label="Last render" value={formatMs(m.lastRenderMs)} warn={(m.lastRenderMs ?? 0) > 50} />
        <Metric label="Avg / worst, last 20" value={`${formatMs(m.avgRenderMs)} / ${formatMs(m.maxRenderMs)}`} warn={(m.maxRenderMs ?? 0) > 50} />
        <Metric label="Rows re-rendered, last" value={m.rowsRendered === null ? "—" : formatCount(m.rowsRendered)} />
        <Metric label="Rows in the page" value={formatCount(m.rowsInPage)} />
        <Metric label="Renders per second" value={formatCount(m.rendersPerSec)} />
        <Metric label="Filter + sort, last" value={formatMs(m.deriveMs)} />
        <Metric label="Apply update, last" value={formatMs(m.updateMs)} />
        <Metric label="Typing delay, last / worst" value={`${formatMs(m.inputLastMs)} / ${formatMs(m.inputMaxMs)}`} warn={(m.inputMaxMs ?? 0) > 100} />
        <Metric label="Frame rate" value={fps} warn={m.fps !== null && m.fps < 50} />
        <Metric
          label="Long tasks / blocking, 10 s"
          value={m.longTaskSupported ? `${m.longTasks} / ${formatMs(m.blockingMs)}` : "not supported"}
          warn={m.blockingMs > 200}
        />
      </dl>
    </section>
  );
}

function Metric({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-0.5 rounded-lg border px-3 py-2", warn && "border-warning/50 bg-warning/5")}>
      <dt className="text-xs text-foreground/75">{label}</dt>
      <dd className="font-mono text-sm tabular-nums">
        {value}
        {warn ? <span className={cn("ml-1.5 font-sans text-xs font-semibold", WARN_TEXT)}>slow</span> : null}
      </dd>
    </div>
  );
}
