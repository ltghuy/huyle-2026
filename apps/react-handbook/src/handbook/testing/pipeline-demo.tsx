"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { CHECKS, DEFAULT_PLACEMENT, EDITOR_SECONDS, evaluatePipeline, type Placement, PRE_COMMIT_BUDGET, QUEUE_SECONDS, type Stage, STAGES } from "./pipeline-model";

const STAGE_ITEMS = STAGES.map((s) => ({ value: s.id, label: s.label }));
const STAGE_LABEL = Object.fromEntries(STAGES.map((s) => [s.id, s.label])) as Record<Stage, string>;

const ALL_PRE_COMMIT: Placement = Object.fromEntries(CHECKS.map((c) => [c.id, c.id === "smoke" ? "after-deploy" : "pre-commit"]));

function duration(seconds: number) {
  if (seconds < 60) return `${seconds} s`;
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return rest === 0 ? `${minutes} min` : `${minutes} min ${rest} s`;
}

function StageSelect({ check, value, onChange }: { check: (typeof CHECKS)[number]; value: Stage; onChange: (id: string, stage: Stage) => void }) {
  const id = `pipeline-${check.id}`;
  function handleValueChange(next: Stage | null) {
    if (next) onChange(check.id, next);
  }
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <Label htmlFor={id}>
        {check.label} <span className="font-normal text-foreground/75">({duration(check.seconds)})</span>
      </Label>
      <Select items={STAGE_ITEMS} value={value} onValueChange={handleValueChange}>
        <SelectTrigger id={id} className="w-full text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {STAGE_ITEMS.map((item) => (
            <SelectItem key={item.value} value={item.value} className="text-xs">
              {item.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export function PipelineDemo() {
  const [placement, setPlacement] = useState<Placement>(DEFAULT_PLACEMENT);
  const result = evaluatePipeline(placement);

  function handleStage(id: string, stage: Stage) {
    setPlacement((current) => ({ ...current, [id]: stage }));
  }

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-foreground/75">Start from:</span>
        <Button size="sm" variant="outline" onClick={() => setPlacement(DEFAULT_PLACEMENT)}>
          A typical setup
        </Button>
        <Button size="sm" variant="outline" onClick={() => setPlacement(ALL_PRE_COMMIT)}>
          Everything before commit
        </Button>
      </div>

      <div className="grid min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {CHECKS.map((check) => (
          <StageSelect key={check.id} check={check} value={placement[check.id]} onChange={handleStage} />
        ))}
      </div>

      <p className="text-xs text-foreground/75">
        Simplified model: editor checks report in about {EDITOR_SECONDS} s; pre-commit checks run one after another; each pipeline stage waits {QUEUE_SECONDS} s for a machine, then runs its checks in parallel.
      </p>

      <div className="flex min-w-0 flex-col gap-3" aria-live="polite">
        <ol className="grid min-w-0 gap-2 sm:grid-cols-2 lg:grid-cols-5">
          {result.reports.map((report) => (
            <li key={report.stage} className={report.checks.length > 0 ? "flex min-w-0 flex-col gap-1 rounded-lg border p-3" : "flex min-w-0 flex-col gap-1 rounded-lg border border-dashed p-3"}>
              <span className="text-sm font-medium">{STAGE_LABEL[report.stage]}</span>
              <span className="text-xs text-foreground/75">{report.checks.length > 0 ? report.checks.join(", ") : "Nothing runs here"}</span>
              {report.checks.length > 0 ? (
                <span className="mt-auto pt-1 font-mono text-xs tabular-nums">
                  takes {duration(report.seconds)}, done {duration(report.feedbackAfter)} after the change
                </span>
              ) : null}
            </li>
          ))}
        </ol>

        <ul className="flex flex-col gap-1.5 rounded-lg bg-muted/40 p-3 text-sm">
          <li>
            <span className="font-medium">First feedback: </span>
            {result.firstFeedback ? `${duration(result.firstFeedback.after)}, ${STAGE_LABEL[result.firstFeedback.stage].toLowerCase()}.` : "none, nothing runs before production."}
          </li>
          {result.slowPreCommit ? (
            <li className="font-medium text-[color-mix(in_oklch,var(--warning),black_40%)] dark:text-warning">
              Warning: every commit waits {duration(result.preCommitSeconds)}, over a {PRE_COMMIT_BUDGET} s budget. People skip slow hooks; move the slow suites to the pull request.
            </li>
          ) : null}
          <li>
            <span className="font-medium">Checked only once users have it: </span>
            {result.afterProduction.length > 0 ? result.afterProduction.join(", ") : "nothing"}.
          </li>
          <li>
            <span className="font-medium">Never checked: </span>
            {result.unchecked.length > 0 ? result.unchecked.join(", ") : "nothing"}.
          </li>
        </ul>
      </div>
    </div>
  );
}
