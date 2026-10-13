"use client";

import { Keyboard } from "lucide-react";
import { memo, useDeferredValue, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Choice } from "@/handbook/jwt/token-view";

// A list that is deliberately slow to render, filtered by an input. Each
// keystroke's latency is measured from the input event to the next frame.

type Mode = "urgent" | "deferred";

const MODES = [
  { value: "urgent", label: "List renders with every keystroke" },
  { value: "deferred", label: "List uses useDeferredValue" },
] as const satisfies readonly { value: Mode; label: string }[];

const ITEMS = Array.from({ length: 250 }, (_, i) => `item ${i} ${["react", "render", "reconcile", "fiber", "hooks", "commit"][i % 6]}`);
const WORK_PER_ITEM_MS = 0.5;
const TYPED = "react hooks";

function busyWait(ms: number) {
  const end = performance.now() + ms;
  while (performance.now() < end) {
    // Simulates an expensive row.
  }
}

/** One slow row. Rows are separate components because React can only pause between components, never inside one. */
function SlowRow({ item }: { item: string }) {
  busyWait(WORK_PER_ITEM_MS);
  return <li>{item}</li>;
}

const SlowList = memo(function SlowList({ query }: { query: string }) {
  performance.mark("slow-list-render");
  useEffect(() => {
    performance.mark("slow-list-commit");
  });
  const shown = ITEMS.filter((item) => item.includes(query));
  return (
    <ul className="max-h-40 overflow-auto rounded-lg border p-2 font-mono text-xs" aria-label="Filtered list">
      {shown.map((item) => (
        <SlowRow key={item} item={item} />
      ))}
    </ul>
  );
});

type Stats = { latencies: number[]; renders: number; commits: number; mode: Mode };

const count = (name: string) => performance.getEntriesByName(name).length;

export function SchedulingDemo() {
  const [mode, setMode] = useState<Mode>("urgent");
  const [query, setQuery] = useState("");
  const deferred = useDeferredValue(query);
  const [stats, setStats] = useState<Stats | null>(null);
  const [typing, setTyping] = useState(false);
  const latencies = useRef<number[]>([]);
  const input = useRef<HTMLInputElement>(null);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const stamp = e.timeStamp;
    setQuery(e.target.value);
    // The next frame can only start once the main thread is free.
    requestAnimationFrame(() => latencies.current.push(performance.now() - stamp));
  }

  function handleModeChange(value: Mode) {
    setMode(value);
    setStats(null);
  }

  function startMeasuring() {
    latencies.current = [];
    performance.clearMarks("slow-list-render");
    performance.clearMarks("slow-list-commit");
  }

  function finishMeasuring() {
    setStats({ latencies: [...latencies.current], renders: count("slow-list-render"), commits: count("slow-list-commit"), mode });
  }

  // Types into the input with real input events, one character every 50 ms.
  function handleSimulate() {
    const el = input.current;
    if (!el) return;
    setTyping(true);
    const setValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!;
    setValue.call(el, "");
    el.dispatchEvent(new Event("input", { bubbles: true }));
    setTimeout(() => {
      startMeasuring();
      [...TYPED].forEach((_, i) => {
        setTimeout(() => {
          setValue.call(el, TYPED.slice(0, i + 1));
          el.dispatchEvent(new Event("input", { bubbles: true }));
        }, i * 50);
      });
      setTimeout(() => {
        finishMeasuring();
        setTyping(false);
      }, TYPED.length * 50 + 1500);
    }, 300);
  }

  const avg = stats?.latencies.length ? stats.latencies.reduce((a, b) => a + b, 0) / stats.latencies.length : 0;
  const worst = stats?.latencies.length ? Math.max(...stats.latencies) : 0;

  return (
    <div className="flex flex-col gap-4">
      <Choice legend="Mode" value={mode} options={MODES} onChange={handleModeChange} />
      <div className="grid min-w-0 gap-4 lg:grid-cols-2">
        <div className="flex min-w-0 flex-col gap-2">
          <Label htmlFor="schedule-query">Filter (each list render costs about {Math.round(ITEMS.length * WORK_PER_ITEM_MS)} ms)</Label>
          <Input id="schedule-query" ref={input} value={query} onChange={handleChange} onFocus={startMeasuring} onBlur={finishMeasuring} autoComplete="off" spellCheck={false} />
          <SlowList query={mode === "deferred" ? deferred : query} />
        </div>
        <div className="flex min-w-0 flex-col gap-2">
          <div>
            <Button onClick={handleSimulate} disabled={typing}>
              <Keyboard aria-hidden />
              {typing ? "Typing…" : `Simulate typing "${TYPED}"`}
            </Button>
          </div>
          <div aria-live="polite" className="text-sm">
            {stats && stats.latencies.length ? (
              <dl className="grid grid-cols-2 gap-2">
                <div className="rounded-lg border p-2">
                  <dt className="text-xs text-muted-foreground">Keystrokes</dt>
                  <dd className="tabular-nums">{stats.latencies.length}</dd>
                </div>
                <div className="rounded-lg border p-2">
                  <dt className="text-xs text-muted-foreground">Input to next frame</dt>
                  <dd className="tabular-nums">
                    avg {Math.round(avg)} ms · worst {Math.round(worst)} ms
                  </dd>
                </div>
                <div className="col-span-2 rounded-lg border p-2">
                  <dt className="text-xs text-muted-foreground">List renders started vs committed</dt>
                  <dd className="tabular-nums">
                    {stats.renders} started, {stats.commits} committed
                    {stats.renders > stats.commits ? `: ${stats.renders - stats.commits} were abandoned because newer input arrived` : ""}
                  </dd>
                </div>
              </dl>
            ) : (
              <p className="text-muted-foreground">Simulate typing, or type in the field yourself (results appear when it loses focus).</p>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Latency is measured from each input event to the next frame&apos;s requestAnimationFrame, which can&apos;t start while React is busy rendering on the
            main thread.
          </p>
        </div>
      </div>
    </div>
  );
}
