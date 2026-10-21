"use client";

import { Verdict } from "@/handbook/ui";

import type { TestResult } from "./harness";

/** A test run's results: each test with pass or fail in words, and the failure message. */
export function TestResults({ results, empty = "No tests" }: { results: readonly TestResult[]; empty?: string }) {
  if (results.length === 0) return <p className="text-sm text-foreground/75">{empty}</p>;
  return (
    <ul className="flex flex-col gap-2 text-sm">
      {results.map((result) => (
        <li key={result.name} className="flex min-w-0 flex-col gap-0.5">
          <span className="flex items-start gap-2">
            <span className="shrink-0">
              <Verdict pass={result.pass} />
            </span>
            <span className="min-w-0">{result.name}</span>
          </span>
          {result.message ? <span className="font-mono text-xs break-words text-foreground/75">{result.message}</span> : null}
        </li>
      ))}
    </ul>
  );
}
