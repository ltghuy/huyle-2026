import lastRun from "./last-run.json";
import suiteFiles from "./suite-files.json";

// The end-to-end suite as recorded by its last run (e2e/reporters/handbook-reporter.ts):
// the results, and a copy of the files that produced them. `pnpm test:e2e` rewrites both.

export type Outcome = "expected" | "unexpected" | "flaky" | "skipped";

export type RecordedTest = {
  file: string;
  line: number;
  describe: string;
  title: string;
  outcome: Outcome;
  durationMs: number;
  retries: number;
  error?: string;
};

export type RunSummary = {
  ranAt: string;
  durationMs: number;
  status: string;
  project: string;
  playwright: string;
  totals: { passed: number; failed: number; flaky: number; skipped: number };
  tests: RecordedTest[];
};

const run = lastRun as Partial<RunSummary>;

/** The latest recorded run, or null when none has been recorded yet. */
export const LAST_RUN: RunSummary | null = run.ranAt && run.tests ? (run as RunSummary) : null;

const FILES = suiteFiles as Record<string, string>;

export function suiteFile(path: string): string | null {
  return FILES[path] ?? null;
}

export function recordedTest(file: string, title: string): RecordedTest | null {
  return LAST_RUN?.tests.find((t) => t.file === file && t.title === title) ?? null;
}

export const OUTCOME_LABEL: Record<Outcome, string> = {
  expected: "Passed",
  unexpected: "Failed",
  flaky: "Flaky (passed on retry)",
  skipped: "Skipped",
};

export { POM_PATHS } from "./pom-paths";
