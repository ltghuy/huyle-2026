"use client";

import { useId } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { useRenderReports, type Strategy } from "./render-counter";

export const STRATEGIES: Strategy[] = ["single", "split", "selector"];

export const STRATEGY_LABELS: Record<Strategy, string> = {
  single: "Single context",
  split: "Split state/dispatch",
  selector: "Selectors",
};

/** Phone-width labels, so the sticky board stays short. */
const SHORT_LABELS: Record<Strategy, string> = { single: "Single", split: "Split", selector: "Selectors" };

function StrategyName({ strategy }: { strategy: Strategy }) {
  return (
    <>
      <span className="sm:hidden">{SHORT_LABELS[strategy]}</span>
      <span className="hidden sm:inline">{STRATEGY_LABELS[strategy]}</span>
    </>
  );
}

/**
 * Stays at the top of the shop: pick a strategy, act, and read the result
 * here without scrolling. Not counted itself.
 */
export function Scoreboard({ strategy, onStrategyChange }: { strategy: Strategy; onStrategyChange: (s: Strategy) => void }) {
  const { reports, scores } = useRenderReports();
  const last = reports[0];
  const byStrategy = last ? scores[last.action] : undefined;
  const max = last?.mounted || 1;
  const labelId = useId();

  return (
    <div className="sticky top-12 z-[5] -mx-4 flex flex-col gap-2 border-b bg-background/95 px-4 py-2 backdrop-blur sm:gap-3 sm:py-3 md:-mx-6 md:px-6">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <span id={labelId} className="hidden text-xs font-medium text-muted-foreground sm:inline">
          Sharing strategy
        </span>
        <div role="group" aria-labelledby={labelId} className="flex flex-wrap">
          {STRATEGIES.map((s, i) => (
            <Button
              key={s}
              size="sm"
              variant={strategy === s ? "default" : "outline"}
              aria-pressed={strategy === s}
              onClick={() => onStrategyChange(s)}
              className={cn(i > 0 && "-ml-px", i === 0 ? "rounded-r-none" : i === STRATEGIES.length - 1 ? "rounded-l-none" : "rounded-none")}
            >
              <StrategyName strategy={s} />
            </Button>
          ))}
        </div>
        <p className="text-xs text-foreground/75">
          <span aria-hidden className="mr-1 inline-block size-2.5 rounded-sm outline-2 outline-[color-mix(in_oklch,var(--warning),black_25%)] dark:outline-warning" />
          Flashing<span className="hidden sm:inline"> parts</span> = re-rendered by the action
        </p>
      </div>

      <div className="grid gap-2 sm:grid-cols-[minmax(0,14rem)_minmax(0,1fr)] sm:items-center sm:gap-3">
        <p aria-live="polite" className="text-sm">
          {last ? (
            <>
              <span className="font-mono text-xs text-foreground/75">{last.action}</span>
              <br className="hidden sm:inline" />{" "}
              <span className="text-xl font-semibold tabular-nums sm:text-2xl">{last.renders}</span>
              <span className="text-foreground/75"> of {last.mounted} components <span className="whitespace-nowrap">re-rendered</span></span>
            </>
          ) : (
            <span className="text-foreground/75">Add a product to see how many components re-render.</span>
          )}
        </p>

        <dl aria-label={last ? `Re-renders for ${last.action} by strategy` : "Re-renders by strategy"} className="flex flex-col gap-1 text-xs">
          {STRATEGIES.map((s) => {
            const value = byStrategy?.[s];
            return (
              <div key={s} className="grid grid-cols-[4.5rem_minmax(0,1fr)_auto] items-center gap-2 sm:grid-cols-[9.5rem_minmax(0,1fr)_auto]">
                <dt className={cn("truncate", s === strategy ? "font-medium text-foreground" : "text-foreground/75")}>
                  <StrategyName strategy={s} />
                </dt>
                <dd className="contents">
                  <span aria-hidden className="h-2 overflow-hidden rounded-full bg-muted" title={value === undefined ? undefined : `${value} re-renders`}>
                    {value === undefined ? null : (
                      <span className="block h-full rounded-full bg-primary" style={{ width: `${Math.max(2, (value / max) * 100)}%` }} />
                    )}
                  </span>
                  <span className={cn("tabular-nums", value === undefined ? "text-foreground/75" : "font-medium text-foreground")}>
                    {value === undefined ? "not yet" : value}
                  </span>
                </dd>
              </div>
            );
          })}
        </dl>
      </div>
    </div>
  );
}
