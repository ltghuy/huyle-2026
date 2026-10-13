"use client";

import { Check, Play, X } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CodePanel } from "@/handbook/build-pipeline/code-panel";
import { Choice } from "@/handbook/jwt/token-view";
import { cn } from "@/lib/utils";

import { CONSTRUCTS, TYPE_ERROR, TYPESCRIPT_VERSION } from "./constructs";

const OPTIONS = CONSTRUCTS.map((c) => ({ value: c.id, label: c.label }));

type RunResult = { logs: string[]; error: string | null };

/** Runs the fixed sample's transpiled output with a captured console. */
function runTypeErrorOutput(): RunResult {
  const logs: string[] = [];
  const fakeConsole = { log: (...args: unknown[]) => logs.push(args.map(String).join(" ")) };
  try {
    new Function("console", TYPE_ERROR.output)(fakeConsole);
    return { logs, error: null };
  } catch (error) {
    return { logs, error: error instanceof Error ? `${error.name}: ${error.message}` : String(error) };
  }
}

export function ErasableDemo() {
  const [id, setId] = useState(CONSTRUCTS[0].id);
  const [run, setRun] = useState<RunResult | null>(null);
  const construct = CONSTRUCTS.find((c) => c.id === id)!;

  function handleRun() {
    setRun(runTypeErrorOutput());
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4">
        <Choice legend="TypeScript construct" value={id} options={OPTIONS} onChange={setId} />
        <p aria-live="polite" className={cn("flex items-start gap-2 rounded-lg border p-2 text-sm", construct.erasable ? "border-success/40" : "border-destructive/40 bg-destructive/5")}>
          {construct.erasable ? <Check aria-hidden className="mt-0.5 size-4 shrink-0 text-success" /> : <X aria-hidden className="mt-0.5 size-4 shrink-0 text-destructive" />}
          <span>
            <strong>{construct.erasable ? "Erasable: " : "Not erasable: "}</strong>
            {construct.notes}
          </span>
        </p>
        <div className="grid min-w-0 gap-3 lg:grid-cols-2">
          <CodePanel title="Source (.ts)" code={construct.source} />
          <Tabs defaultValue="ts" className="min-w-0">
            <TabsList aria-label="Real output">
              <TabsTrigger value="ts">TypeScript {TYPESCRIPT_VERSION}</TabsTrigger>
              <TabsTrigger value="babel">Babel 7.29</TabsTrigger>
            </TabsList>
            <TabsContent value="ts">
              <CodePanel title="tsc output (per file)" code={construct.tsOutput || "// (nothing left)\n"} />
            </TabsContent>
            <TabsContent value="babel">
              <CodePanel title="Babel output" code={construct.babelOutput.trim() ? construct.babelOutput : "// (nothing left)\n"} />
            </TabsContent>
          </Tabs>
        </div>
        <div className="text-sm">
          <p className="text-xs text-muted-foreground">With erasableSyntaxOnly and isolatedModules on, the type checker says:</p>
          {construct.diagnostics.length ? (
            <ul className="mt-1 flex flex-col gap-1">
              {construct.diagnostics.map((d) => (
                <li key={d} className="font-mono text-xs">
                  {d}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-1 font-mono text-xs">No errors.</p>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-3 border-t pt-4">
        <h4 className="text-sm font-medium">A type error doesn&apos;t stop the transpiler</h4>
        <div className="grid min-w-0 gap-3 lg:grid-cols-2">
          <CodePanel title="shout.ts" code={TYPE_ERROR.source} />
          <CodePanel title="Transpiled output (types stripped, nothing checked)" code={TYPE_ERROR.output} />
        </div>
        <p className="text-sm">
          <span className="text-xs text-muted-foreground">tsc --noEmit reports:</span> <code className="font-mono text-xs">{TYPE_ERROR.diagnostics.join(" ")}</code>
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="outline" onClick={handleRun}>
            <Play aria-hidden />
            Run the transpiled output
          </Button>
          <p aria-live="polite" className="font-mono text-xs">
            {run ? (run.error ? `Threw ${run.error}` : `Logged: ${run.logs.join(" | ")}`) : "Runs it here, in your browser."}
          </p>
        </div>
      </div>
    </div>
  );
}
