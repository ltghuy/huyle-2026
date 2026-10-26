"use client";

import {
  Ban,
  CircleCheck,
  Database,
  Eraser,
  Hourglass,
  LoaderCircle,
  OctagonX,
  TimerOff,
  TriangleAlert,
  type LucideIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import type { Counters, Outcome, TimelineEntry } from "./search-engine";
import { perfNow, useNow } from "./use-search";

const OUTCOMES: Record<Outcome, { label: string; icon: LucideIcon; bar: string }> = {
  debounced: { label: "Debounced", icon: TimerOff, bar: "border border-dashed border-foreground/50" },
  "cache-hit": { label: "Cache hit", icon: Database, bar: "bg-primary" },
  pending: { label: "Pending", icon: LoaderCircle, bar: "bg-primary/40 motion-safe:animate-pulse" },
  shown: { label: "Shown", icon: CircleCheck, bar: "bg-success" },
  aborted: { label: "Aborted", icon: Ban, bar: "bg-foreground/35" },
  stale: { label: "Stale, dropped", icon: Hourglass, bar: "bg-warning" },
  error: { label: "Failed", icon: TriangleAlert, bar: "bg-destructive" },
  "error-dropped": { label: "Failed, dropped", icon: OctagonX, bar: "bg-destructive/50" },
};

const AXIS_WINDOW_MS = 4000;

const COUNTERS: { key: keyof Counters; label: string }[] = [
  { key: "keystrokes", label: "Keystrokes" },
  { key: "debounced", label: "Debounced" },
  { key: "requests", label: "Requests sent" },
  { key: "cacheHits", label: "Cache hits" },
  { key: "aborted", label: "Aborted" },
  { key: "stale", label: "Stale dropped" },
  { key: "errors", label: "Errors" },
];

export function RequestTimeline({
  timeline,
  counters,
  onClear,
}: {
  timeline: TimelineEntry[];
  counters: Counters;
  onClear: () => void;
}) {
  const pending = timeline.some((e) => e.endedAt === null);
  const now = useNow(perfNow, pending, 100);

  // One shared axis, so overlap and finishing order show. It covers the
  // last few seconds of activity; older rows keep their text but no bar.
  let t0 = Infinity;
  let t1 = -Infinity;
  const newest = timeline[0]?.startedAt ?? 0;
  for (const e of timeline) {
    if (e.startedAt >= newest - AXIS_WINDOW_MS) t0 = Math.min(t0, e.startedAt);
    t1 = Math.max(t1, e.endedAt ?? Math.max(now, e.startedAt));
  }
  const span = Math.max(t1 - t0, 1);
  // Start times are shown relative to the oldest visible row.
  const origin = timeline.at(-1)?.startedAt ?? 0;

  return (
    <section aria-labelledby="timeline-heading" className="flex min-w-0 flex-col gap-3 rounded-xl border p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 id="timeline-heading" className="text-sm font-semibold">
          Request timeline
        </h3>
        <Button type="button" variant="outline" size="sm" onClick={onClear} disabled={timeline.length === 0}>
          <Eraser aria-hidden /> Clear
        </Button>
      </div>

      <dl className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4 lg:grid-cols-7">
        {COUNTERS.map(({ key, label }) => (
          <div key={key} className="rounded-lg bg-muted/60 px-3 py-2">
            <dt className="text-xs text-foreground/75">{label}</dt>
            <dd className="text-lg font-semibold tabular-nums">{counters[key]}</dd>
          </div>
        ))}
      </dl>

      {timeline.length === 0 ? (
        <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
          Type in the box: every debounced keystroke, cache hit and request appears here, newest first.
        </p>
      ) : (
        <ol aria-label="Search events, newest first" className="flex flex-col divide-y">
          {timeline.map((entry) => (
            <TimelineRow key={entry.id} entry={entry} origin={origin} t0={t0} span={span} now={now} />
          ))}
        </ol>
      )}
    </section>
  );
}

function TimelineRow({ entry, origin, t0, span, now }: {
  entry: TimelineEntry; origin: number; t0: number; span: number; now: number;
}) {
  const outcome = OUTCOMES[entry.outcome];
  const Icon = outcome.icon;
  const end = entry.endedAt ?? Math.max(now, entry.startedAt);
  const left = ((entry.startedAt - t0) / span) * 100;
  const width = ((end - entry.startedAt) / span) * 100;
  const start = Math.round(entry.startedAt - origin);
  const duration = Math.round(end - entry.startedAt);

  return (
    <li className="grid min-w-0 gap-1 py-2 text-xs sm:grid-cols-[minmax(0,17rem)_minmax(0,1fr)] sm:items-center sm:gap-3">
      <div className="flex min-w-0 items-center gap-2">
        <Icon
          aria-hidden
          className={cn("size-3.5 shrink-0", entry.outcome === "pending" && "motion-safe:animate-spin")}
        />
        <span className="shrink-0 font-medium">
          {entry.revalidate ? "Refresh · " : ""}
          {outcome.label}
        </span>
        <code className="min-w-0 truncate rounded bg-muted px-1 py-0.5">{entry.query}</code>
        <span className="ml-auto shrink-0 text-foreground/75 tabular-nums">
          +{start} ms
          {entry.kind === "cache" ? "" : ` · ${duration} ms${entry.endedAt === null ? "…" : ""}`}
        </span>
      </div>
      <div aria-hidden className="relative h-3 overflow-hidden rounded-sm bg-muted/50">
        {entry.startedAt >= t0 ? (
          <div
            className={cn("absolute inset-y-0 min-w-1 rounded-sm", outcome.bar)}
            style={{ left: `${left}%`, width: `${width}%` }}
          />
        ) : null}
      </div>
      {entry.message ? <p className="text-foreground/75 sm:col-span-2">{entry.message}</p> : null}
    </li>
  );
}
