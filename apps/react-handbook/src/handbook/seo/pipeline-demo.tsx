"use client";

import { Check, Minus, X } from "lucide-react";
import { useState } from "react";

import { Choice } from "@/handbook/jwt/token-view";
import { Toggle } from "@/handbook/ui";
import { cn } from "@/lib/utils";

import { type ConditionId, CONDITIONS, runPipeline, STAGES, type Status, STATUS_OPTIONS } from "./pipeline";

const STATE_WORD = { pass: "passed", stop: "stopped here", skip: "never reached" } as const;

export function PipelineDemo() {
  const [conditions, setConditions] = useState<ReadonlySet<ConditionId>>(new Set());
  const [status, setStatus] = useState<Status>("200");
  const result = runPipeline(conditions, status);

  function handleToggle(id: ConditionId, on: boolean) {
    setConditions((current) => {
      const next = new Set(current);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <Choice legend="The URL answers with" value={status} options={STATUS_OPTIONS} onChange={setStatus} />
      <fieldset className="flex min-w-0 flex-col gap-2">
        <legend className="mb-1.5 text-xs font-medium text-foreground/75">The page</legend>
        <div className="grid min-w-0 gap-2 sm:grid-cols-2">
          {CONDITIONS.map((c) => (
            <Toggle
              key={c.id}
              checked={conditions.has(c.id)}
              onCheckedChange={(on) => handleToggle(c.id, on)}
              title={c.label}
              detail={<code className="font-mono">{c.detail}</code>}
            />
          ))}
        </div>
      </fieldset>

      <div aria-live="polite" className="flex min-w-0 flex-col gap-3">
        <ol className="grid min-w-0 gap-2 sm:grid-cols-5">
          {result.stages.map((stage, i) => {
            const meta = STAGES[i];
            return (
              <li
                key={stage.id}
                className={cn(
                  "flex min-w-0 flex-col gap-1 rounded-lg border p-2.5 text-xs",
                  stage.state === "stop" && "border-destructive/50 bg-destructive/5",
                  stage.state === "skip" && "border-dashed text-foreground/70",
                )}
              >
                <span className="flex items-center gap-1.5 text-sm font-medium">
                  {stage.state === "pass" ? (
                    <Check aria-hidden className="size-4 text-success" />
                  ) : stage.state === "stop" ? (
                    <X aria-hidden className="size-4 text-destructive" />
                  ) : (
                    <Minus aria-hidden className="size-4" />
                  )}
                  {meta.title}
                </span>
                <span className={cn(stage.state === "pass" && "text-success", stage.state === "stop" && "font-medium text-destructive")}>{STATE_WORD[stage.state]}</span>
              </li>
            );
          })}
        </ol>

        <div className="flex flex-col gap-1.5 rounded-lg bg-muted/40 p-3 text-sm">
          {result.stop ? (
            <>
              <p>
                <span className="font-medium">Stops at {STAGES.find((s) => s.id === result.stop!.stage)!.title.toLowerCase()}.</span> {result.stop.cause}
              </p>
              <p>
                <span className="font-medium">Search Console reports: </span>
                {result.stop.reason ? <q className="font-mono text-xs">{result.stop.reason}</q> : "nothing; it doesn't list URLs Google never found."}
              </p>
              <p>
                <span className="font-medium">Fix: </span>
                {result.stop.fix}
              </p>
            </>
          ) : (
            <p>
              <span className="font-medium">
                Search Console reports <q className="font-mono text-xs">Page is indexed</q>.
              </span>{" "}
              The page is eligible to appear. Where it ranks is a separate question: it depends on the query, how relevant and useful the page is, and who
              is searching.
            </p>
          )}
          {result.unreached.length > 0 ? (
            <p className="text-foreground/85">
              <span className="font-medium">Never checked: </span>
              {result.unreached.join(", ")}. The page stopped before the crawler got that far.
            </p>
          ) : null}
          {result.notes.map((note) => (
            <p key={note} className="text-foreground/85">
              <span className="font-medium">Note: </span>
              {note}
            </p>
          ))}
        </div>
      </div>
    </div>
  );
}
