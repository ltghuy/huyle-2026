"use client";

import { Check, X } from "lucide-react";
import { useMemo, useState } from "react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CodePanel } from "@/handbook/build-pipeline/code-panel";
import { sizeLabel, useSize } from "@/handbook/build-pipeline/sizes";
import { Toggle } from "@/handbook/ui";
import { cn } from "@/lib/utils";

import { buildGraph } from "./bundler/graph";
import { bundle } from "./bundler/link";
import { treeShake } from "./bundler/treeshake";
import { treeShakeProject } from "./projects";

const SHOWN_FILES = ["src/main.ts", "src/format.ts", "node_modules/icons/package.json", "node_modules/icons/index.js", "node_modules/icons/cart.js"];

export function TreeShakeDemo() {
  const [sideEffectsFalse, setSideEffectsFalse] = useState(false);
  const [pure, setPure] = useState(false);
  const files = useMemo(() => treeShakeProject({ sideEffectsFalse, pure }), [sideEffectsFalse, pure]);
  const { full, shaken, report } = useMemo(() => {
    const graph = buildGraph(files, "src/main.ts");
    const result = treeShake(graph, files);
    return { full: bundle(graph)[0].code, shaken: bundle(graph, { keep: result.keep, usedExports: result.usedExports })[0].code, report: result.report };
  }, [files]);
  const fullSize = useSize(full);
  const shakenSize = useSize(shaken);
  const included = report.filter((m) => m.included).length;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-2 sm:grid-cols-2">
        <Toggle
          checked={sideEffectsFalse}
          onCheckedChange={setSideEffectsFalse}
          title={<>icons/package.json: &quot;sideEffects&quot;: false</>}
          detail="The library promises its modules do nothing on import that matters if you don't use their exports."
        />
        <Toggle checked={pure} onCheckedChange={setPure} title={"Mark createRegistry() as /*#__PURE__*/"} detail="Tells the bundler the call has no side effects, so an unused result can go." />
      </div>

      <p aria-live="polite" className="text-sm">
        {included} of {report.length} modules kept. Bundle: <span className="tabular-nums">{sizeLabel(fullSize)}</span> without tree shaking,{" "}
        <span className="font-medium tabular-nums">{sizeLabel(shakenSize)}</span> with it.
      </p>

      <ul className="grid gap-2 md:grid-cols-2" aria-label="Modules after tree shaking">
        {report.map((m) => (
          <li key={m.path} className={cn("flex flex-col gap-1 rounded-lg border p-2 text-xs", m.included ? "" : "border-dashed bg-muted/40")}>
            <p className="flex items-center gap-1.5">
              {m.included ? <Check aria-hidden className="size-4 text-success" /> : <X aria-hidden className="size-4 text-destructive" />}
              <code className="font-mono font-medium break-all">{m.path}</code>
              <span className="sr-only">{m.included ? "kept" : "dropped"}</span>
            </p>
            <p className="text-foreground/80">{m.reason}</p>
            {m.exports.length ? (
              <p className="flex flex-wrap gap-1.5 font-mono">
                {m.exports.map((e) => (
                  <span key={e.name} className={cn("rounded-sm border px-1", e.used ? "border-success/50" : "text-foreground/70 line-through")}>
                    {e.name}
                    <span className="sr-only">{e.used ? " (used)" : " (removed)"}</span>
                  </span>
                ))}
              </p>
            ) : null}
          </li>
        ))}
      </ul>

      <div className="grid min-w-0 gap-3 lg:grid-cols-2">
        <Tabs defaultValue={SHOWN_FILES[0]} className="min-w-0">
          <TabsList aria-label="Source files" className="h-auto max-w-full flex-wrap justify-start">
            {SHOWN_FILES.map((f) => (
              <TabsTrigger key={f} value={f} className="flex-none font-mono text-xs">
                {f.replace("node_modules/", "").replace("src/", "")}
              </TabsTrigger>
            ))}
          </TabsList>
          {SHOWN_FILES.map((f) => (
            <TabsContent key={f} value={f}>
              <CodePanel title={f} code={files[f]} />
            </TabsContent>
          ))}
        </Tabs>
        <CodePanel title="main.js after tree shaking" code={shaken} />
      </div>
      <p className="text-xs text-muted-foreground">
        Simplified: real tree shakers (Rollup, Rolldown, webpack with Terser) work the same way, with finer analysis of what counts as a side effect. Minifying
        afterwards removes the rest.
      </p>
    </div>
  );
}
