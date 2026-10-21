"use client";

import { useState } from "react";

import { Choice } from "@/handbook/jwt/token-view";

import { runTestsSync } from "./harness";
import { BEHAVIOUR_TESTS_SOURCE, behaviourTests, CHANGES, DETAIL_TESTS_SOURCE, detailTests } from "./price-sample";
import { TestResults } from "./test-results";

const OPTIONS = CHANGES.map((change) => ({ value: change.id, label: change.label }));

function verdictFor(kind: (typeof CHANGES)[number]["kind"], detailFailed: number, behaviourFailed: number) {
  if (kind === "original") return "Nothing changed, so every test passes.";
  if (kind === "refactor") {
    return detailFailed > 0
      ? `False alarm: ${detailFailed} implementation-detail test${detailFailed === 1 ? "" : "s"} failed on a change no user can see. The behaviour tests passed.`
      : "Every test passed, as it should for a refactor.";
  }
  const caught = behaviourFailed > 0 ? "The behaviour tests caught it." : "The behaviour tests missed it too.";
  return detailFailed === 0 ? `Missed bug: every implementation-detail test passed. ${caught} With no tests, this ships.` : `${caught} With no tests, this ships.`;
}

export function WhyTestDemo() {
  const [changeId, setChangeId] = useState<string>("original");
  const change = CHANGES.find((c) => c.id === changeId)!;
  const detail = runTestsSync(detailTests(change.make));
  const behaviour = runTestsSync(behaviourTests(change.make));
  const detailFailed = detail.filter((r) => !r.pass).length;
  const behaviourFailed = behaviour.filter((r) => !r.pass).length;

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <Choice legend="Change to the price code" value={changeId} options={OPTIONS} onChange={setChangeId} />

      <div className="flex min-w-0 flex-col gap-2">
        <p className="text-sm text-foreground/85">{change.note}</p>
        <pre className="relative max-h-72 overflow-auto rounded-lg border bg-muted/40 p-3 font-mono text-xs leading-relaxed" tabIndex={0} aria-label={`Source after: ${change.label}`}>
          {change.source}
        </pre>
      </div>

      <div className="grid min-w-0 gap-4 md:grid-cols-3" aria-live="polite">
        <div className="flex min-w-0 flex-col gap-2 rounded-lg border p-3">
          <h4 className="text-sm font-medium">Tests on implementation details</h4>
          <TestResults results={detail} />
        </div>
        <div className="flex min-w-0 flex-col gap-2 rounded-lg border p-3">
          <h4 className="text-sm font-medium">Tests on behaviour</h4>
          <TestResults results={behaviour} />
        </div>
        <div className="flex min-w-0 flex-col gap-2 rounded-lg border border-dashed p-3">
          <h4 className="text-sm font-medium">No tests</h4>
          <p className="text-sm text-foreground/75">Nothing runs, so nothing fails. Whatever the change does reaches users.</p>
        </div>
      </div>

      <p className="rounded-lg bg-muted/40 p-3 text-sm" role="status">
        {verdictFor(change.kind, detailFailed, behaviourFailed)}
      </p>

      <details className="text-sm">
        <summary className="cursor-pointer rounded-sm font-medium outline-none focus-visible:ring-3 focus-visible:ring-ring/50">Show the test code</summary>
        <div className="mt-2 grid min-w-0 gap-3 md:grid-cols-2">
          <pre className="relative overflow-auto rounded-lg border bg-muted/40 p-3 font-mono text-xs leading-relaxed" tabIndex={0} aria-label="Implementation-detail tests">
            {DETAIL_TESTS_SOURCE}
          </pre>
          <pre className="relative overflow-auto rounded-lg border bg-muted/40 p-3 font-mono text-xs leading-relaxed" tabIndex={0} aria-label="Behaviour tests">
            {BEHAVIOUR_TESTS_SOURCE}
          </pre>
        </div>
      </details>
    </div>
  );
}
