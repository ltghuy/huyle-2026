"use client";

import { Check, CircleHelp, Split } from "lucide-react";
import { useDeferredValue, useId, useState, useSyncExternalStore } from "react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CodeBlock } from "@/handbook/e2e/code-block";

import { matchStep, parseGherkin, type StepDef } from "./gherkin";
import { lintPickle } from "./lint";

const MAX_LENGTH = 6000;

function subscribe() {
  return () => {};
}

function readDraft(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function saveDraft(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Storage blocked (private mode): the draft just isn't kept.
  }
}

/** Write a feature, see it parsed, expanded and matched against the suite's step definitions. */
export function ScenarioEditor({ storageKey, initial, alternatives = [], defs, lint = false }: { storageKey: string; initial: string; alternatives?: readonly { label: string; text: string }[]; defs: readonly StepDef[]; lint?: boolean }) {
  const id = useId();
  const mounted = useSyncExternalStore(subscribe, () => true, () => false);
  const [edited, setEdited] = useState<string | null>(null);
  // Before the first edit, show the saved draft (browser only) or the starting text.
  const text = edited ?? (mounted ? (readDraft(storageKey) ?? initial) : initial);
  const deferred = useDeferredValue(text);
  const parsed = parseGherkin(deferred.slice(0, MAX_LENGTH));
  const tooLong = text.length > MAX_LENGTH;

  function handleChange(event: React.ChangeEvent<HTMLTextAreaElement>) {
    setEdited(event.target.value);
    saveDraft(storageKey, event.target.value);
  }

  function handleLoad(value: string) {
    setEdited(value);
    saveDraft(storageKey, value);
  }

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div className="grid min-w-0 gap-4 xl:grid-cols-2">
        <div className="flex min-w-0 flex-col gap-2">
          <Label htmlFor={id}>Feature file</Label>
          <Textarea id={id} value={text} onChange={handleChange} rows={14} spellCheck={false} className="font-mono text-xs leading-relaxed" />
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => handleLoad(initial)}>
              Start again
            </Button>
            {alternatives.map((alt) => (
              <Button key={alt.label} size="sm" variant="outline" onClick={() => handleLoad(alt.text)}>
                {alt.label}
              </Button>
            ))}
          </div>
          <p className="text-xs text-foreground/75">Your draft stays in this browser only.</p>
        </div>

        <div className="flex min-w-0 flex-col gap-3" aria-live="polite">
          {tooLong ? <p className="text-sm text-destructive">Only the first {MAX_LENGTH.toLocaleString("en-US")} characters are checked.</p> : null}
          {text.trim() === "" ? <p className="text-sm text-foreground/75">Start with a line like &quot;Feature: Discount codes&quot;, then a Scenario and its steps.</p> : null}
          {parsed.errors.length > 0 && text.trim() !== "" ? (
            <ul className="flex flex-col gap-1.5 rounded-lg border border-destructive/40 p-3 text-sm">
              {parsed.errors.map((e, i) => (
                <li key={i}>
                  <span className="font-mono text-xs">Line {e.line}:</span> {e.message}
                </li>
              ))}
            </ul>
          ) : null}
          {parsed.errors.length === 0 && parsed.pickles.length === 0 && text.trim() !== "" ? (
            <p className="text-sm text-foreground/75">The file parses, but it has no scenario yet.</p>
          ) : null}

          {parsed.pickles.map((pickle) => {
            const findings = lint ? lintPickle(pickle) : [];
            return (
              <section key={pickle.id} className="flex min-w-0 flex-col gap-2 rounded-lg border p-3">
                <h4 className="text-sm font-medium">{pickle.name}</h4>
                <ul className="flex flex-col gap-2">
                  {pickle.steps.map((step) => {
                    const m = matchStep(step.text, defs);
                    return (
                      <li key={step.id} className="flex min-w-0 flex-col gap-1 text-sm">
                        <span className="flex items-start gap-2">
                          {m.status === "matched" ? (
                            <Check aria-hidden className="mt-0.5 size-4 shrink-0 text-success" />
                          ) : m.status === "ambiguous" ? (
                            <Split aria-hidden className="mt-0.5 size-4 shrink-0 text-destructive" />
                          ) : (
                            <CircleHelp aria-hidden className="mt-0.5 size-4 shrink-0 text-destructive" />
                          )}
                          <span className="min-w-0">
                            <span className="font-mono text-xs">{step.text}</span>
                            <span className="block text-xs text-foreground/75">
                              {m.status === "matched"
                                ? `Matched "${m.def.pattern}"${m.args.length ? ` with ${m.args.map((a) => JSON.stringify(a)).join(", ")}` : ""}`
                                : m.status === "ambiguous"
                                  ? `Ambiguous: matches ${m.defs.map((d) => `"${d.pattern}"`).join(" and ")}`
                                  : "Undefined: no step definition matches yet"}
                            </span>
                          </span>
                        </span>
                        {m.status === "undefined" ? <CodeBlock path="suggested step definition" code={m.snippet} /> : null}
                      </li>
                    );
                  })}
                </ul>
                {lint ? (
                  findings.length > 0 ? (
                    <ul className="flex flex-col gap-1 rounded-md bg-muted/40 p-2 text-xs">
                      {findings.map((f) => (
                        <li key={f.rule}>
                          <span className="font-medium">{f.rule}:</span> {f.detail}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs text-foreground/75">Reads as behaviour: one action, an outcome a user can see, no interface details.</p>
                  )
                ) : null}
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}
