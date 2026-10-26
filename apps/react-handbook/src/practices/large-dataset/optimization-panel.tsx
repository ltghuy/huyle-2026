"use client";

import { Gauge } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { confirm } from "@/practices/accessible-modal/modal-store";

import type { Optimizations } from "./benchmark";
import { formatCount } from "./format";

export const ALL_ON: Optimizations = {
  windowing: true, memoRows: true, cachedDerive: true, deferredFilter: true, indexedUpdates: true,
};
export const ALL_OFF: Optimizations = {
  windowing: false, memoRows: false, cachedDerive: false, deferredFilter: false, indexedUpdates: false,
};
/** Above this, turning windowing off asks first. */
export const HEAVY_ROWS = 20_000;

export const OPTIMIZATIONS: { key: keyof Optimizations; title: string; on: string; off: string }[] = [
  { key: "windowing", title: "Windowing", on: "Renders only the rows near the viewport.", off: "Renders every matching row." },
  { key: "memoRows", title: "Memoized rows", on: "Re-renders only rows whose data or selection changed.", off: "Re-renders every rendered row." },
  { key: "cachedDerive", title: "Cached filter & sort", on: "Filters and sorts only when data, filter or sort change.", off: "Filters and sorts on every render." },
  { key: "deferredFilter", title: "Deferred filtering", on: "The input updates first; the board follows when it can.", off: "Each keystroke waits for the board." },
  { key: "indexedUpdates", title: "Indexed updates", on: "Finds updated rows by id in a map.", off: "Scans the list for every updated row." },
];

/** Shared confirmation (practice 9) before rendering a heavy board in full. */
export function heavyWarning(rows: number) {
  return confirm({
    title: "Render every row?",
    description: `Without windowing the board renders all ${formatCount(rows)} rows (about ${formatCount(rows * 8)} DOM elements). The tab may freeze for several seconds on each update.`,
    confirmLabel: "Render them all",
    cancelLabel: "Keep windowing",
    destructive: true,
  });
}

const same = (a: Optimizations, b: Optimizations) => OPTIMIZATIONS.every(({ key }) => a[key] === b[key]);

export function OptimizationPanel({
  flags,
  rows,
  disabled,
  onChange,
}: {
  flags: Optimizations;
  rows: number;
  disabled: boolean;
  onChange: (flags: Optimizations) => void;
}) {
  const preset = same(flags, ALL_ON) ? "Optimized" : same(flags, ALL_OFF) ? "Naive" : "Custom";

  async function apply(next: Optimizations) {
    if (flags.windowing && !next.windowing && rows > HEAVY_ROWS && !(await heavyWarning(rows))) return;
    onChange(next);
  }

  function handleToggle(key: keyof Optimizations, on: boolean) {
    void apply({ ...flags, [key]: on });
  }

  return (
    <section aria-labelledby="optimizations-heading" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <h3 id="optimizations-heading" className="flex items-center gap-2 text-sm font-semibold">
          <Gauge aria-hidden className="size-4 text-muted-foreground" /> Optimizations
        </h3>
        <span className="text-sm text-foreground/75">· {preset}</span>
        <div className="ml-auto flex gap-2">
          <Button variant="outline" size="sm" aria-pressed={preset === "Naive"} disabled={disabled} onClick={() => apply(ALL_OFF)}>
            Naive
          </Button>
          <Button variant="outline" size="sm" aria-pressed={preset === "Optimized"} disabled={disabled} onClick={() => apply(ALL_ON)}>
            Optimized
          </Button>
        </div>
      </div>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
        {OPTIMIZATIONS.map(({ key, title, on, off }) => (
          <label
            key={key}
            className={cn(
              "flex cursor-pointer gap-2 rounded-lg border p-3 text-sm has-focus-visible:ring-3 has-focus-visible:ring-ring/50",
              flags[key] ? "border-primary/40 bg-primary/5" : "border-dashed",
              disabled && "cursor-not-allowed opacity-60",
            )}
          >
            <input
              type="checkbox"
              checked={flags[key]}
              disabled={disabled}
              onChange={(e) => handleToggle(key, e.target.checked)}
              className="mt-0.5 size-4 shrink-0 accent-primary outline-none"
            />
            <span className="flex flex-col gap-0.5">
              <span className="font-medium">{title}</span>
              <span className="text-xs text-foreground/75">{flags[key] ? on : off}</span>
            </span>
          </label>
        ))}
      </div>
    </section>
  );
}
