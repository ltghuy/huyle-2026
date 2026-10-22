import { CodeTabs } from "@/handbook/e2e/code-tabs";
import { LAST_RUN, OUTCOME_LABEL, suiteFile } from "@/handbook/e2e/suite";
import { Verdict } from "@/handbook/ui";

const SPEC = "e2e/specs/seo.spec.ts";

const DATE = new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" });

/** This site's SEO tests as recorded by the last run of the end-to-end suite, with the spec that ran. */
export function TestsDemo() {
  const tests = LAST_RUN?.tests.filter((t) => t.file === SPEC) ?? [];
  const passed = tests.filter((t) => t.outcome === "expected" || t.outcome === "flaky").length;

  return (
    <div className="flex min-w-0 flex-col gap-4">
      {LAST_RUN === null ? (
        <p className="rounded-lg border border-dashed p-3 text-sm text-foreground/75">
          No run has been recorded yet. Run <code className="font-mono text-xs">pnpm test:e2e</code> to record one.
        </p>
      ) : tests.length === 0 ? (
        <p className="rounded-lg border border-dashed p-3 text-sm text-foreground/75">
          The last recorded run ({DATE.format(new Date(LAST_RUN.ranAt))} UTC) is older than the SEO spec, so it has no SEO results yet.
        </p>
      ) : (
        <div className="flex min-w-0 flex-col gap-2">
          <p className="text-sm">
            <Verdict pass={passed === tests.length}>
              {passed} of {tests.length} SEO tests passed
            </Verdict>{" "}
            in the run recorded {DATE.format(new Date(LAST_RUN.ranAt))} UTC, against the production build.
          </p>
          <div className="relative overflow-x-auto" role="region" aria-label="Recorded SEO test results" tabIndex={0}>
            <table className="w-full min-w-[32rem] text-left text-sm">
              <thead>
                <tr className="border-b text-xs text-foreground/75">
                  <th className="py-1.5 pr-3 font-medium">Test</th>
                  <th className="py-1.5 pr-3 font-medium">Result</th>
                  <th className="py-1.5 font-medium">Time</th>
                </tr>
              </thead>
              <tbody>
                {tests.map((t) => (
                  <tr key={`${t.describe}|${t.title}`} className="border-b align-top last:border-0">
                    <td className="py-1.5 pr-3">
                      <span className="block text-xs text-foreground/75">{t.describe}</span>
                      {t.title}
                      {t.error ? <span className="block font-mono text-xs text-destructive">{t.error}</span> : null}
                    </td>
                    <td className="py-1.5 pr-3">
                      <Verdict pass={t.outcome === "expected" || t.outcome === "flaky"}>{OUTCOME_LABEL[t.outcome]}</Verdict>
                    </td>
                    <td className="py-1.5 font-mono text-xs tabular-nums">{(t.durationMs / 1000).toFixed(2)} s</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      <CodeTabs label="The SEO spec" files={[{ path: SPEC, code: suiteFile(SPEC) }]} />
    </div>
  );
}
