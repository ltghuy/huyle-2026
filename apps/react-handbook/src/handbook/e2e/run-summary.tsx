import { Verdict } from "@/handbook/ui";

import { LAST_RUN, OUTCOME_LABEL } from "./suite";

const DATE = new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" });

function seconds(ms: number) {
  return `${(ms / 1000).toFixed(1)} s`;
}

/** The latest recorded run of the suite: every test with its result. */
export function RunSummary() {
  if (!LAST_RUN) {
    return (
      <p className="rounded-lg border border-dashed p-3 text-sm text-foreground/75">
        No run has been recorded yet. Run <code className="font-mono text-xs">pnpm test:e2e</code> to record one.
      </p>
    );
  }
  const { totals } = LAST_RUN;
  return (
    <div className="flex min-w-0 flex-col gap-3">
      <p className="text-sm">
        <span className="font-medium">Latest recorded run:</span> {DATE.format(new Date(LAST_RUN.ranAt))} UTC, {LAST_RUN.project} with Playwright {LAST_RUN.playwright}, {seconds(LAST_RUN.durationMs)} in total.{" "}
        <span className="font-mono tabular-nums">
          {totals.passed} passed · {totals.failed} failed · {totals.flaky} flaky · {totals.skipped} skipped
        </span>
      </p>
      <div className="relative overflow-x-auto" role="region" aria-label="Recorded test results" tabIndex={0}>
        <table className="w-full min-w-[40rem] text-left text-sm">
          <thead>
            <tr className="border-b text-xs text-foreground/75">
              <th className="py-1.5 pr-3 font-medium">Test</th>
              <th className="py-1.5 pr-3 font-medium">File</th>
              <th className="py-1.5 pr-3 font-medium">Result</th>
              <th className="py-1.5 pr-3 font-medium">Time</th>
              <th className="py-1.5 font-medium">Retries</th>
            </tr>
          </thead>
          <tbody>
            {LAST_RUN.tests.map((t) => (
              <tr key={`${t.file}:${t.line}`} className="border-b align-top last:border-0">
                <td className="py-1.5 pr-3">
                  <span className="block text-xs text-foreground/75">{t.describe}</span>
                  {t.title}
                  {t.error ? <span className="block font-mono text-xs text-destructive">{t.error}</span> : null}
                </td>
                <td className="py-1.5 pr-3 font-mono text-xs">
                  {t.file.replace("e2e/specs/", "")}:{t.line}
                </td>
                <td className="py-1.5 pr-3">
                  <Verdict pass={t.outcome === "expected" || t.outcome === "flaky"}>{OUTCOME_LABEL[t.outcome]}</Verdict>
                </td>
                <td className="py-1.5 pr-3 font-mono text-xs tabular-nums">{seconds(t.durationMs)}</td>
                <td className="py-1.5 font-mono text-xs tabular-nums">{t.retries}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
