// A simplified model of where checks run. Durations are typical values for a
// mid-sized frontend, listed on the page; nothing is measured.

export type Stage = "editor" | "pre-commit" | "pull-request" | "main" | "after-deploy" | "never";

export const STAGES: readonly { id: Stage; label: string; detail: string }[] = [
  { id: "editor", label: "In the editor", detail: "as you type" },
  { id: "pre-commit", label: "Before commit", detail: "blocks the commit" },
  { id: "pull-request", label: "On the pull request", detail: "in parallel, before merge" },
  { id: "main", label: "On the main branch", detail: "after merge, before deploy" },
  { id: "after-deploy", label: "After deploy", detail: "against production" },
  { id: "never", label: "Never", detail: "not run" },
];

export type CheckKind = { id: string; label: string; seconds: number; stage: Stage };

export const CHECKS: readonly CheckKind[] = [
  { id: "types", label: "Type check", seconds: 15, stage: "editor" },
  { id: "lint", label: "Lint", seconds: 10, stage: "editor" },
  { id: "unit", label: "Unit tests", seconds: 25, stage: "pull-request" },
  { id: "integration", label: "Integration tests", seconds: 120, stage: "pull-request" },
  { id: "e2e", label: "End-to-end journeys", seconds: 480, stage: "main" },
  { id: "visual", label: "Visual comparisons", seconds: 300, stage: "main" },
  { id: "smoke", label: "Smoke test", seconds: 60, stage: "after-deploy" },
];

/** In the editor, checks run on the changed file only and report in about a second. */
export const EDITOR_SECONDS = 1;
/** Waiting for a CI machine before a pipeline stage starts. */
export const QUEUE_SECONDS = 60;
/** Above this, people start skipping the pre-commit hook. */
export const PRE_COMMIT_BUDGET = 30;

export type Placement = Record<string, Stage>;

export const DEFAULT_PLACEMENT: Placement = Object.fromEntries(CHECKS.map((c) => [c.id, c.stage]));

export type StageReport = { stage: Stage; checks: string[]; seconds: number; feedbackAfter: number };

export function evaluatePipeline(placement: Placement) {
  let elapsed = 0;
  const reports: StageReport[] = [];
  for (const stage of STAGES) {
    if (stage.id === "never") continue;
    const checks = CHECKS.filter((c) => placement[c.id] === stage.id);
    let seconds = 0;
    if (stage.id === "editor") seconds = checks.length > 0 ? EDITOR_SECONDS : 0;
    else if (stage.id === "pre-commit") seconds = checks.reduce((sum, c) => sum + c.seconds, 0);
    else if (checks.length > 0) seconds = QUEUE_SECONDS + Math.max(...checks.map((c) => c.seconds));
    elapsed += seconds;
    reports.push({ stage: stage.id, checks: checks.map((c) => c.label), seconds, feedbackAfter: elapsed });
  }
  const first = reports.find((r) => r.checks.length > 0);
  const preCommit = reports.find((r) => r.stage === "pre-commit")!;
  return {
    reports,
    firstFeedback: first ? { stage: first.stage, after: first.feedbackAfter } : null,
    preCommitSeconds: preCommit.seconds,
    slowPreCommit: preCommit.seconds > PRE_COMMIT_BUDGET,
    afterProduction: CHECKS.filter((c) => placement[c.id] === "after-deploy").map((c) => c.label),
    unchecked: CHECKS.filter((c) => placement[c.id] === "never").map((c) => c.label),
  };
}
