"use client";

import { TriangleAlert } from "lucide-react";
import { useDeferredValue, useMemo } from "react";

import { cn } from "@/lib/utils";

import { buildGraph, type ImportKindInGraph } from "./bundler/graph";
import { FileEditor } from "./file-editor";
import { SHOP } from "./projects";
import { useProject } from "./use-project";

const KIND_LABEL: Record<ImportKindInGraph, string> = { static: "import", dynamic: "import()", sideEffect: "side effect", reexport: "re-export" };

export function GraphDemo() {
  const { files, update, reset, changed } = useProject(SHOP);
  const deferred = useDeferredValue(files);
  const graph = useMemo(() => buildGraph(deferred, "src/main.ts"), [deferred]);
  const modules = [...graph.modules.values()];
  const problems = modules.flatMap((m) => [
    ...(m.error ? [`${m.path}:${m.error.line + 1}:${m.error.column + 1}: ${m.error.message}`] : []),
    ...m.imports.filter((i) => i.error).map((i) => `${m.path}: ${i.error}`),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <FileEditor files={files} onChange={update} onReset={reset} changed={changed} label="Project files" />
      <div aria-live="polite" className="flex flex-col gap-2">
        {problems.map((p) => (
          <p key={p} className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/5 p-2 font-mono text-xs">
            <TriangleAlert aria-hidden className="size-4 shrink-0 text-destructive" />
            <span className="break-all">{p}</span>
          </p>
        ))}
        {graph.cycles.map((c) => (
          <p key={c.join()} className="flex items-start gap-2 rounded-lg border border-destructive/40 p-2 text-xs">
            <TriangleAlert aria-hidden className="size-4 shrink-0 text-destructive" />
            <span>
              <strong>Import cycle:</strong> <span className="font-mono">{c.join(" → ")}</span>
            </span>
          </p>
        ))}
      </div>
      <p className="text-sm">
        {modules.length} modules found from <code className="font-mono text-xs">src/main.ts</code>. Static imports finish evaluating in this order:{" "}
        <span className="font-mono text-xs">{graph.order.map((p) => p.replace("src/", "")).join(" → ")}</span>
      </p>
      <p className="text-xs text-muted-foreground">
        The graph is read from the compiled files, so an import that is never used as a value (or only as a type) was already removed by the transpiler and
        never reaches it. To make a cycle, import something from cart.ts into format.ts and use it.
      </p>
      <ul className="grid gap-2 md:grid-cols-2" aria-label="Module graph">
        {modules.map((m) => (
          <li key={m.path} className={cn("flex flex-col gap-1.5 rounded-lg border p-3 text-xs", m.path === graph.entry && "border-primary")}>
            <p className="flex flex-wrap items-baseline justify-between gap-2">
              <code className="font-mono text-sm font-medium">{m.path}</code>
              {m.path === graph.entry ? <span className="rounded-sm border px-1">entry</span> : null}
            </p>
            <div>
              <p className="text-muted-foreground">Imports</p>
              {m.imports.length ? (
                <ul className="flex flex-col gap-0.5">
                  {m.imports.map((i) => (
                    <li key={`${i.kind}-${i.specifier}`} className="flex flex-wrap gap-x-1.5 font-mono">
                      <span className="rounded-sm bg-muted px-1">{KIND_LABEL[i.kind]}</span>
                      <span>&quot;{i.specifier}&quot;</span>
                      <span aria-hidden>→</span>
                      <span className={cn(!i.resolved && "text-destructive")}>{i.resolved ?? "unresolved"}</span>
                      {i.names.length && i.kind !== "dynamic" ? <span className="text-foreground/70">{`{ ${i.names.join(", ")} }`}</span> : null}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="font-mono">none</p>
              )}
            </div>
            <p>
              <span className="text-muted-foreground">Exports:</span> <span className="font-mono">{m.exports.join(", ") || "none"}</span>
            </p>
            <p>
              <span className="text-muted-foreground">Imported by:</span> <span className="font-mono">{(graph.importers.get(m.path) ?? []).join(", ") || "nothing (entry)"}</span>
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
