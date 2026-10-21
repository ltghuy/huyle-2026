"use client";

import { useId, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Code } from "@/components/playground/code";

import {
  drawDelay,
  type RunResult,
  runOnce,
  type Strategy,
  STRATEGIES,
} from "./waits";

type Tally = { pass: number; fail: number; totalMs: number; delays: number };
type Results = Record<Strategy, Tally>;

const EMPTY: Results = {
  sleep: { pass: 0, fail: 0, totalMs: 0, delays: 0 },
  poll: { pass: 0, fail: 0, totalMs: 0, delays: 0 },
  auto: { pass: 0, fail: 0, totalMs: 0, delays: 0 },
};

function NumberField({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}) {
  const id = useId();
  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const next = Math.round(Number(event.target.value));
    onChange(Number.isFinite(next) ? Math.min(Math.max(next, min), max) : min);
  }
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        value={value}
        onChange={handleChange}
      />
    </div>
  );
}

function verdict(strategy: Strategy, tally: Tally, base: number) {
  const runs = tally.pass + tally.fail;
  if (runs === 0) return null;
  const avg = tally.totalMs / runs;
  const avgDelay = tally.delays / runs;
  if (tally.fail > 0)
    return `Failed ${tally.fail} of ${runs} runs: the page wasn't ready when it looked.`;
  if (strategy === "sleep" && avg - avgDelay > 150)
    return `Passed, but waited about ${Math.round(avg - avgDelay)} ms per run after the page was ready.`;
  if (strategy === "auto")
    return `Passed every run, finishing soon after the page was ready (about ${Math.round(avg - avgDelay)} ms later, the gap between retries).`;
  return base > 0 ? "Passed every run at this speed." : "Passed.";
}

export function WaitDemo() {
  const [base, setBase] = useState(300);
  const [variance, setVariance] = useState(400);
  const [runs, setRuns] = useState(50);
  const [results, setResults] = useState<Results>(EMPTY);
  const [running, setRunning] = useState(false);
  const controller = useRef<AbortController | null>(null);

  async function handleRun() {
    controller.current?.abort();
    const ac = new AbortController();
    controller.current = ac;
    setRunning(true);
    setResults(EMPTY);
    const jobs: Promise<void>[] = [];
    for (const { id } of STRATEGIES) {
      for (let i = 0; i < runs; i++) {
        const delay = drawDelay(base, variance);
        jobs.push(
          runOnce(id, delay, ac.signal).then((r: RunResult) => {
            setResults((current) => ({
              ...current,
              [id]: {
                pass: current[id].pass + (r.pass ? 1 : 0),
                fail: current[id].fail + (r.pass ? 0 : 1),
                totalMs: current[id].totalMs + r.ms,
                delays: current[id].delays + delay,
              },
            }));
          }),
        );
      }
    }
    await Promise.allSettled(jobs);
    if (controller.current === ac) setRunning(false);
  }

  function handleStop() {
    controller.current?.abort();
    setRunning(false);
  }

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div className="grid min-w-0 gap-3 sm:grid-cols-3">
        <NumberField
          label="Save takes about (ms)"
          value={base}
          min={0}
          max={4000}
          onChange={setBase}
        />
        <NumberField
          label="Give or take (ms)"
          value={variance}
          min={0}
          max={4000}
          onChange={setVariance}
        />
        <NumberField
          label="Runs per strategy"
          value={runs}
          min={1}
          max={100}
          onChange={setRuns}
        />
      </div>
      <div className="flex flex-wrap gap-2">
        <Button onClick={handleRun} disabled={running}>
          {running ? "Running…" : `Run each strategy ${runs} times`}
        </Button>
        <Button variant="outline" onClick={handleStop} disabled={!running}>
          Stop
        </Button>
      </div>

      <div className="grid min-w-0 gap-3 lg:grid-cols-3" aria-live="polite">
        {STRATEGIES.map((s) => {
          const tally = results[s.id];
          const done = tally.pass + tally.fail;
          const text = verdict(s.id, tally, base);
          return (
            <div
              key={s.id}
              className="flex min-w-0 flex-col gap-2 rounded-lg border p-3"
            >
              <h4 className="text-sm font-medium">{s.label}</h4>
              <p className="text-xs text-foreground/75">{s.detail}</p>
              <pre
                className="relative overflow-auto rounded-md bg-muted/40 p-2 font-mono text-[0.6875rem] leading-relaxed"
                tabIndex={0}
                aria-label={`${s.label}: test code`}
              >
                <Code code={s.code} />
              </pre>
              <p className="font-mono text-xs tabular-nums">
                {done}/{runs} run · {tally.pass} passed · {tally.fail} failed ·{" "}
                {done > 0 ? `${Math.round(tally.totalMs / done)} ms avg` : "–"}
              </p>
              {text && done === runs ? <p className="text-sm">{text}</p> : null}
            </div>
          );
        })}
      </div>
      <p className="text-xs text-foreground/75">
        The app is a stand-in whose status changes after a random delay; the
        waiting runs on real timers in your browser, with Playwright&apos;s
        default 5 s timeout and its retry intervals (100, 250, 500, then 1000
        ms).
      </p>
    </div>
  );
}
