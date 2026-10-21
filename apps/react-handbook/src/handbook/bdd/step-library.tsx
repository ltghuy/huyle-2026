"use client";

import { useMemo, useState } from "react";

import { cn } from "@/lib/utils";

import { matchStep, parseGherkin, type StepDef } from "./gherkin";
import { StepInspector } from "./step-inspector";

type Usage = { text: string; feature: string };

/** Every step definition, the feature steps that use it, and what one of them runs. */
export function StepLibrary({ defs, features }: { defs: readonly StepDef[]; features: readonly { path: string; text: string }[] }) {
  const usage = useMemo(() => {
    const byDef = new Map<StepDef, Usage[]>();
    for (const f of features) {
      const parsed = parseGherkin(f.text, f.path);
      const name = parsed.document?.feature?.name ?? f.path;
      const seen = new Set<string>();
      for (const pickle of parsed.pickles) {
        for (const step of pickle.steps) {
          if (seen.has(step.text)) continue;
          seen.add(step.text);
          const m = matchStep(step.text, defs);
          if (m.status === "matched") byDef.set(m.def, [...(byDef.get(m.def) ?? []), { text: step.text, feature: name }]);
        }
      }
    }
    return byDef;
  }, [defs, features]);

  const [selected, setSelected] = useState<string | null>(null);

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div className="relative overflow-x-auto" role="region" aria-label="Step definitions" tabIndex={0}>
        <table className="w-full min-w-[40rem] text-left text-sm">
          <thead>
            <tr className="border-b text-xs text-foreground/75">
              <th className="py-1.5 pr-3 font-medium">Step pattern</th>
              <th className="py-1.5 pr-3 font-medium">Calls</th>
              <th className="py-1.5 font-medium">Used by (select one)</th>
            </tr>
          </thead>
          <tbody>
            {defs.map((def) => {
              const uses = usage.get(def) ?? [];
              return (
                <tr key={`${def.file}:${def.line}`} className="border-b align-top last:border-0">
                  <td className="py-1.5 pr-3">
                    <code className="font-mono text-xs">
                      {def.keyword}(&quot;{def.pattern}&quot;)
                    </code>
                    <span className="block font-mono text-xs text-foreground/75">
                      {def.file.replace("e2e/steps/", "")}:{def.line}
                    </span>
                  </td>
                  <td className="py-1.5 pr-3 font-mono text-xs">{def.calls.join(", ") || "none"}</td>
                  <td className="py-1.5">
                    {uses.length === 0 ? (
                      <span className="text-xs text-foreground/75">Not used by any scenario</span>
                    ) : (
                      <ul className="flex flex-col gap-0.5">
                        {uses.map((u) => (
                          <li key={u.text}>
                            <button
                              type="button"
                              aria-pressed={selected === u.text}
                              onClick={() => setSelected(u.text)}
                              className={cn("rounded-sm px-1 text-left font-mono text-xs outline-none hover:bg-muted/60 focus-visible:ring-3 focus-visible:ring-ring/50", selected === u.text && "bg-primary/10")}
                            >
                              {u.text}
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="rounded-lg border p-3" aria-live="polite">
        {selected ? <StepInspector text={selected} defs={defs} /> : <p className="text-sm text-foreground/75">Select a step on the right of the table to see the code it runs.</p>}
      </div>
    </div>
  );
}
