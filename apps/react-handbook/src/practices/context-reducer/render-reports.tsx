"use client";

import { RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";

import { resetCounters, useRenderReports } from "./render-counter";
import { STRATEGY_LABELS } from "./scoreboard";

/** Not counted itself: it only shows the counts. */
export function RenderReports() {
  const { reports } = useRenderReports();

  return (
    <section aria-labelledby="render-reports-heading" className="flex min-w-0 flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <h3 id="render-reports-heading" className="text-sm font-medium">
          Re-render history
        </h3>
        <Button variant="ghost" size="sm" onClick={resetCounters}>
          <RotateCcw aria-hidden /> Reset counters
        </Button>
      </div>
      {reports.length === 0 ? (
        <p className="rounded-lg border border-dashed p-3 text-foreground/75">
          Add a product: this shows how many components re-rendered for it under the current strategy.
        </p>
      ) : (
        <ol aria-label="Last 10 actions" className="flex flex-col divide-y rounded-lg border text-xs">
          {reports.map((r) => (
            <li key={r.id} className="flex flex-col gap-0.5 px-3 py-2">
              <span className="flex flex-wrap items-baseline justify-between gap-x-3">
                <span className="font-mono font-medium">{r.action}</span>
                <span className="text-foreground/75">{STRATEGY_LABELS[r.strategy]}</span>
                <span className="font-medium tabular-nums">
                  {r.renders} of {r.mounted}
                </span>
              </span>
              <span className="truncate text-foreground/75" title={r.names.join(", ")}>
                {r.names.length > 0 ? r.names.join(", ") : "nothing re-rendered"}
              </span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
