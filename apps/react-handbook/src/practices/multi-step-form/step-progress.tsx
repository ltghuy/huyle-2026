"use client";

import { Check, CircleAlert, Lock } from "lucide-react";

import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import type { StepId } from "@/server/practices/multi-step-form/application.schema";

import { useFormSelector } from "./form-store";
import { STEPS, stepStatus, type StepStatus } from "./steps";

const STATUS_TEXT: Record<StepStatus, string> = {
  current: "current step",
  complete: "complete",
  attention: "needs attention",
  incomplete: "not finished",
  locked: "not available yet",
};

function StatusIcon({ status, number }: { status: StepStatus; number: number }) {
  if (status === "complete") return <Check aria-hidden className="size-3.5" />;
  if (status === "attention") return <CircleAlert aria-hidden className="size-3.5" />;
  if (status === "locked") return <Lock aria-hidden className="size-3" />;
  return <span aria-hidden>{number}</span>;
}

/**
 * Steps that apply right now. A vertical list on large screens (reachable
 * steps are buttons), a compact "Step X of N" bar below that.
 */
export function StepProgress({ steps, current, onSelect }: { steps: StepId[]; current: StepId; onSelect: (step: StepId) => void }) {
  // One string, so the list re-renders only when a status changes.
  const statuses = useFormSelector((s) =>
    steps.map((step) => stepStatus(step, current, { values: s.values, furthest: s.furthest, attempted: s.attempted, today: s.today })).join(","),
  ).split(",") as StepStatus[];
  const index = steps.indexOf(current);

  return (
    <>
      <div className="flex flex-col gap-2 lg:hidden">
        <p className="text-sm font-medium">
          Step {index + 1} of {steps.length}: {STEPS[current].title}
        </p>
        <Progress value={((index + 1) / steps.length) * 100} aria-label={`Step ${index + 1} of ${steps.length}`} />
      </div>

      <nav aria-label="Application steps" className="hidden lg:block">
        <ol className="flex flex-col gap-1">
          {steps.map((step, i) => {
            const status = statuses[i];
            const body = (
              <>
                <span
                  className={cn(
                    "flex size-6 shrink-0 items-center justify-center rounded-full border text-xs font-medium tabular-nums",
                    status === "current" && "border-primary bg-primary text-primary-foreground",
                    status === "complete" && "border-primary text-primary",
                    status === "attention" && "border-warning bg-warning/15 text-foreground",
                  )}
                >
                  <StatusIcon status={status} number={i + 1} />
                </span>
                <span className="flex min-w-0 flex-col text-left">
                  <span className={cn("truncate", status === "current" && "font-medium")}>{STEPS[step].title}</span>
                  {status === "attention" ? <span className="text-xs text-muted-foreground">Needs attention</span> : null}
                </span>
                <span className="sr-only">, {STATUS_TEXT[status]}</span>
              </>
            );
            return (
              <li key={step}>
                {status === "locked" ? (
                  <span className="flex min-h-11 items-center gap-3 rounded-md px-2 text-sm text-muted-foreground">{body}</span>
                ) : (
                  <button
                    type="button"
                    aria-current={status === "current" ? "step" : undefined}
                    onClick={() => onSelect(step)}
                    className={cn(
                      "flex min-h-11 w-full items-center gap-3 rounded-md px-2 text-sm outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50",
                      status === "current" && "bg-muted",
                    )}
                  >
                    {body}
                  </button>
                )}
              </li>
            );
          })}
        </ol>
      </nav>
    </>
  );
}
