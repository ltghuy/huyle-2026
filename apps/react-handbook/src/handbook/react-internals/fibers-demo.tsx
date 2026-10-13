"use client";

import { Minus, Plus, RotateCcw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";

import { currentRoot, type FiberView, fiberId, viewTree } from "./fibers";
import { useIsolatedRoot } from "./isolated-root";

// The sample app lives in its own React root. Every commit changes its DOM, so a
// MutationObserver on its container tells the demo when to re-read the fibers.

function Counter({ label }: { label: string }) {
  const [count, setCount] = useState(0);
  const [step, setStep] = useState(1);
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border p-2 text-sm">
      <span className="font-medium">
        {label}: {count}
      </span>
      <Button size="sm" variant="outline" onClick={() => setCount((c) => c - step)} aria-label={`${label}: subtract ${step}`}>
        <Minus aria-hidden />
      </Button>
      <Button size="sm" variant="outline" onClick={() => setCount((c) => c + step)} aria-label={`${label}: add ${step}`}>
        <Plus aria-hidden />
      </Button>
      <Button size="sm" variant="ghost" onClick={() => setStep((s) => (s === 1 ? 10 : 1))}>
        step {step}
      </Button>
    </div>
  );
}

function SampleApp() {
  return (
    <section className="flex flex-col gap-2">
      <Counter key="apples" label="Apples" />
      <Counter key="pears" label="Pears" />
    </section>
  );
}

// Production builds minify function names; displayName keeps them readable in the fiber tree (as in DevTools).
Counter.displayName = "Counter";
SampleApp.displayName = "SampleApp";

function FiberNode({ node }: { node: FiberView }) {
  return (
    <li className="flex flex-col">
      <span className="flex flex-wrap items-baseline gap-x-1.5">
        <span className="text-foreground/70">{node.tag}</span>
        <span className="font-medium">{node.name}</span>
        {node.key !== null ? <span className="text-foreground/70">key={JSON.stringify(node.key)}</span> : null}
        {node.detail ? <span className="break-all text-foreground/80">{node.detail}</span> : null}
        <span className="text-foreground/60">#{node.id}</span>
      </span>
      {node.hooks.length ? (
        <ul className="ml-3 text-foreground/80">
          {node.hooks.map((h, i) => (
            <li key={i}>
              hook {i + 1}: {h}
            </li>
          ))}
        </ul>
      ) : null}
      {node.children.length ? (
        <ul className="ml-3 border-l pl-2">
          {node.children.map((c) => (
            <FiberNode key={c.id} node={c} />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

type Snapshot = { tree: FiberView[]; rootId: number; commits: number };

export function FibersDemo() {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [history, setHistory] = useState<number[]>([]);
  const [resetKey, setResetKey] = useState(0);
  const container = useIsolatedRoot(useMemo(() => <SampleApp key={resetKey} />, [resetKey]));

  useEffect(() => {
    const el = container.current;
    if (!el) return;
    const read = () => {
      const root = currentRoot(el);
      if (!root) return;
      const rootId = fiberId(root);
      setSnapshot((s) => ({ tree: viewTree(root), rootId, commits: (s?.commits ?? 0) + (s?.rootId === rootId ? 0 : 1) }));
      setHistory((h) => (h[h.length - 1] === rootId ? h : [...h, rootId].slice(-8)));
    };
    const observer = new MutationObserver(read);
    observer.observe(el, { subtree: true, childList: true, characterData: true, attributes: true });
    return () => observer.disconnect();
  }, [container]);

  function handleReset() {
    setHistory([]);
    setResetKey((k) => k + 1);
  }

  return (
    <div className="grid min-w-0 gap-4 lg:grid-cols-2">
      <div className="flex min-w-0 flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-medium">The sample app (a separate React root)</p>
          <Button variant="ghost" size="sm" onClick={handleReset}>
            <RotateCcw aria-hidden />
            Reset
          </Button>
        </div>
        <div ref={container} className="rounded-lg border border-dashed p-3" />
        <p aria-live="polite" className="text-sm">
          {history.length
            ? `The root's current HostRoot fiber, commit by commit: ${history.map((id) => `#${id}`).join(" → ")}. Two copies take turns: React builds the next tree in the copy that isn't on screen, then swaps.`
            : "Reading the fiber tree…"}
        </p>
        <p className="text-xs text-muted-foreground">
          Fibers are React 19.2 internals read through private fields (<code className="font-mono">__reactContainer$…</code>, <code className="font-mono">memoizedState</code>):
          fine for learning, never for app code, because they change between React versions.
        </p>
      </div>
      <div role="region" aria-label="Fiber tree" tabIndex={0} className="max-h-[28rem] overflow-auto rounded-lg border p-2 font-mono text-xs outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
        {snapshot ? (
          <ul>
            {snapshot.tree.map((n) => (
              <FiberNode key={n.id} node={n} />
            ))}
          </ul>
        ) : (
          <p className="text-muted-foreground">Waiting for the first commit…</p>
        )}
      </div>
    </div>
  );
}
