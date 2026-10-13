"use client";

import { RefreshCw, Zap } from "lucide-react";
import { useMemo, useState } from "react";

import { Choice } from "@/handbook/jwt/token-view";
import { cn } from "@/lib/utils";

import { buildGraph } from "./bundler/graph";
import { propagate } from "./bundler/hmr";
import { SHOP } from "./projects";

const short = (p: string) => p.replace("src/", "");

export function HmrDemo() {
  const graph = useMemo(() => buildGraph(SHOP, "src/main.ts"), []);
  const paths = [...graph.modules.keys()];
  const [edited, setEdited] = useState("src/format.ts");
  const [accepts, setAccepts] = useState<Set<string>>(() => new Set(["src/cart.ts"]));
  const result = propagate(graph, edited, accepts);

  function handleAcceptToggle(path: string) {
    setAccepts((current) => {
      const next = new Set(current);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <Choice legend="Edit and save" value={edited} options={paths.map((p) => ({ value: p, label: <span className="font-mono text-xs">{short(p)}</span> }))} onChange={setEdited} />
      <fieldset className="flex flex-col gap-1.5">
        <legend className="mb-1.5 text-xs font-medium text-foreground/75">Modules that accept hot updates (import.meta.hot.accept, or React components under Fast Refresh)</legend>
        <div className="flex flex-wrap gap-x-4 gap-y-2">
          {paths.map((p) => (
            <label key={p} className="flex min-h-6 items-center gap-2 font-mono text-xs">
              <input type="checkbox" checked={accepts.has(p)} onChange={() => handleAcceptToggle(p)} className="size-4 accent-primary" />
              {short(p)}
            </label>
          ))}
        </div>
      </fieldset>
      <div aria-live="polite" className={cn("flex items-start gap-2 rounded-lg border p-3 text-sm", result.fullReload ? "border-destructive/40 bg-destructive/5" : "border-success/40")}>
        {result.fullReload ? <RefreshCw aria-hidden className="mt-0.5 size-4 shrink-0 text-destructive" /> : <Zap aria-hidden className="mt-0.5 size-4 shrink-0 text-success" />}
        <p>
          {result.fullReload ? (
            <>
              <strong>Full page reload.</strong> {result.reason}, so the update can&apos;t be applied in place and all state is lost.
            </>
          ) : (
            <>
              <strong>Hot update.</strong> Re-run {result.boundaries.map(short).join(" and ")} with the new {short(edited)}; the rest of the page and its state stay.
            </>
          )}
        </p>
      </div>
      <ol className="flex flex-col gap-1 font-mono text-xs" aria-label="Propagation paths">
        {result.chains.map((chain) => (
          <li key={chain.join()} className="flex flex-wrap items-center gap-1.5">
            {chain.map((p, i) => (
              <span key={`${p}-${i}`} className="flex items-center gap-1.5">
                {i > 0 ? (
                  <>
                    <span aria-hidden>←</span>
                    <span className="sr-only">imported by</span>
                  </>
                ) : null}
                <span className={cn("rounded-sm border px-1", accepts.has(p) && "border-success bg-success/10")}>{short(p)}</span>
              </span>
            ))}
          </li>
        ))}
      </ol>
      <p className="text-xs text-muted-foreground">Each path walks from the edited file up through the modules that import it, and stops at the first one that accepts the update.</p>
    </div>
  );
}
