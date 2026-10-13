"use client";

import { Play } from "lucide-react";
import { useDeferredValue, useMemo, useState } from "react";
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CodePanel } from "@/handbook/build-pipeline/code-panel";

import { printValue, runJsx } from "./elements";

const SAMPLE = `function Badge({ label }: { label: string }) {
  return <b className="badge">{label}</b>;
}

const items = ["Tea", "Coffee"];

const element = (
  <ul className="menu">
    {items.map((item) => (
      <li key={item}>
        {item} <Badge label="new" />
      </li>
    ))}
  </ul>
);
`;

type Rendered = { html: string; calls: Record<string, number> } | { error: string };

export function ElementsDemo() {
  const [source, setSource] = useState(SAMPLE);
  const deferred = useDeferredValue(source);
  const result = useMemo(() => runJsx(deferred), [deferred]);
  const [rendered, setRendered] = useState<{ source: string; output: Rendered } | null>(null);

  // Render the element into a detached root, then read the HTML and how often components ran.
  function handleRender() {
    const fresh = runJsx(deferred);
    if (!fresh.ok) return;
    const container = document.createElement("div");
    const root = createRoot(container);
    let output: Rendered;
    try {
      flushSync(() => root.render(fresh.value as React.ReactNode));
      output = { html: container.innerHTML, calls: { ...fresh.calls } };
    } catch (error) {
      output = { error: error instanceof Error ? error.message : String(error) };
    }
    root.unmount();
    setRendered({ source: deferred, output });
  }

  const shownRender = rendered?.source === deferred ? rendered.output : null;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid min-w-0 gap-3 lg:grid-cols-2">
        <div className="flex min-w-0 flex-col gap-1.5">
          <Label htmlFor="jsx-element" className="font-mono text-xs">
            element.tsx (edit me; the value of <code>element</code> is shown)
          </Label>
          <Textarea id="jsx-element" value={source} onChange={(e) => setSource(e.target.value)} spellCheck={false} wrap="off" className="min-h-72 font-mono text-xs leading-relaxed" />
        </div>
        <div className="flex min-w-0 flex-col gap-2" aria-live="polite">
          {result.ok ? (
            <>
              <CodePanel title="element, as returned by React's jsx()" code={printValue(result.value) + "\n"} showSize={false} />
              {result.components.length ? (
                <p className="text-sm">
                  Creating the element called{" "}
                  {result.components.map((c, i) => (
                    <span key={c}>
                      {i ? ", " : ""}
                      <code className="font-mono text-xs">{c}</code> {result.calls[c]} {result.calls[c] === 1 ? "time" : "times"}
                    </span>
                  ))}
                  : a component is only a <code className="font-mono text-xs">type</code> here. React calls it later, when it renders.
                </p>
              ) : null}
            </>
          ) : (
            <p className="rounded-lg border border-destructive/40 bg-destructive/5 p-2 text-xs">
              <strong>{result.stage === "compile" ? "Compile error" : "Error while running"}:</strong> {result.message}
            </p>
          )}
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <div>
          <Button variant="outline" onClick={handleRender} disabled={!result.ok}>
            <Play aria-hidden />
            Render it with React
          </Button>
        </div>
        {shownRender ? (
          "error" in shownRender ? (
            <p className="text-sm text-destructive">{shownRender.error}</p>
          ) : (
            <div className="flex flex-col gap-1.5">
              <p aria-live="polite" className="text-sm">
                Rendering called {Object.entries(shownRender.calls).map(([c, n]) => `${c} ${n} ${n === 1 ? "time" : "times"}`).join(", ") || "no components"} and produced this DOM:
              </p>
              <CodePanel title="container.innerHTML" code={shownRender.html + "\n"} wrap />
            </div>
          )
        ) : null}
      </div>
      {result.ok ? (
        <details className="text-sm">
          <summary className="cursor-pointer font-medium">The JavaScript that ran</summary>
          <CodePanel className="mt-2" title="element.js" code={result.code} />
        </details>
      ) : null}
    </div>
  );
}
