"use client";

import { CodeBlock } from "@/handbook/e2e/code-block";

import { matchStep, type StepDef } from "./gherkin";

/** What one step sentence runs: the matching definition, the values it captured and the page object calls behind it. */
export function StepInspector({ text, defs }: { text: string; defs: readonly StepDef[] }) {
  const match = matchStep(text, defs);
  if (match.status === "undefined") {
    return (
      <div className="flex min-w-0 flex-col gap-2 text-sm">
        <p>No step definition matches &quot;{text}&quot;. The runner would stop here and suggest:</p>
        <CodeBlock path="suggested step definition" code={match.snippet} />
      </div>
    );
  }
  if (match.status === "ambiguous") {
    return (
      <p className="text-sm">
        &quot;{text}&quot; matches {match.defs.length} definitions ({match.defs.map((d) => `"${d.pattern}"`).join(", ")}), so the runner refuses it as ambiguous.
      </p>
    );
  }
  const { def, args } = match;
  const lines = new Set(Array.from({ length: def.source.split("\n").length }, (_, i) => i + 1));
  return (
    <div className="flex min-w-0 flex-col gap-2 text-sm">
      <p>
        Matches <code className="font-mono text-xs">{def.keyword}(&quot;{def.pattern}&quot;)</code> in{" "}
        <span className="font-mono text-xs">
          {def.file}:{def.line}
        </span>
        {args.length > 0 ? (
          <>
            , capturing{" "}
            {args.map((a, i) => (
              <span key={i}>
                {i > 0 ? ", " : ""}
                <code className="rounded bg-muted/60 px-1 font-mono text-xs">{a}</code>
              </span>
            ))}
          </>
        ) : null}
        .{" "}
        {def.calls.length > 0 ? (
          <>
            It calls{" "}
            {def.calls.map((c, i) => (
              <span key={c}>
                {i > 0 ? ", " : ""}
                <code className="font-mono text-xs">{c}</code>
              </span>
            ))}
            ; the page object does the finding and clicking.
          </>
        ) : null}
      </p>
      <CodeBlock path={`${def.file}:${def.line}`} code={def.source} marked={lines} label={`Step definition for ${def.pattern}`} />
    </div>
  );
}
