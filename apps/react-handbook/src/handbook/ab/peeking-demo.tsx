"use client";

import { useId, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";

import { type Arm, drawConversions, zTest } from "./stats";

// A/A experiments (no real difference), judged two ways on the same data:
// stop at the first significant daily check, or test once at the planned end.

const ALPHA = 0.05;
const BASELINE = 0.05;
const CHUNK = 20;

type Inputs = { experiments: number; days: number; perDay: number };
type Tally = { done: number; peekWins: number; fixedWins: number; stopDays: number[] };

const EMPTY: Tally = { done: 0, peekWins: 0, fixedWins: 0, stopDays: [] };

function runOne({ days, perDay }: Inputs) {
  let a: Arm = { visitors: 0, conversions: 0 };
  let b: Arm = { visitors: 0, conversions: 0 };
  let stoppedOn: number | null = null;
  for (let day = 1; day <= days; day++) {
    a = { visitors: a.visitors + perDay, conversions: a.conversions + drawConversions(perDay, BASELINE) };
    b = { visitors: b.visitors + perDay, conversions: b.conversions + drawConversions(perDay, BASELINE) };
    if (stoppedOn === null && zTest(a, b).pValue < ALPHA) stoppedOn = day;
  }
  return { stoppedOn, fixedWin: zTest(a, b).pValue < ALPHA };
}

function Field({ label, value, min, max, onChange }: { label: string; value: number; min: number; max: number; onChange: (v: number) => void }) {
  const id = useId();
  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const v = Math.round(Number(event.target.value));
    onChange(Number.isFinite(v) ? Math.min(Math.max(v, min), max) : min);
  }
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} type="number" inputMode="numeric" min={min} max={max} value={value} onChange={handleChange} />
    </div>
  );
}

function pct(x: number) {
  return `${(x * 100).toFixed(1)}%`;
}

export function PeekingDemo() {
  const [inputs, setInputs] = useState<Inputs>({ experiments: 200, days: 28, perDay: 500 });
  const [tally, setTally] = useState<Tally>(EMPTY);
  const [running, setRunning] = useState(false);
  const runId = useRef(0);

  function update(key: keyof Inputs, value: number) {
    setInputs((current) => ({ ...current, [key]: value }));
  }

  function handleRun() {
    const id = ++runId.current;
    const plan = inputs;
    setTally(EMPTY);
    setRunning(true);
    let done = 0;
    // Run in chunks so the page stays responsive and Stop works.
    function step() {
      if (id !== runId.current) return;
      const batch = { peek: 0, fixed: 0, stops: [] as number[] };
      for (let i = 0; i < CHUNK && done < plan.experiments; i++, done++) {
        const r = runOne(plan);
        if (r.stoppedOn !== null) {
          batch.peek++;
          batch.stops.push(r.stoppedOn);
        }
        if (r.fixedWin) batch.fixed++;
      }
      setTally((t) => ({ done, peekWins: t.peekWins + batch.peek, fixedWins: t.fixedWins + batch.fixed, stopDays: [...t.stopDays, ...batch.stops] }));
      if (done < plan.experiments) setTimeout(step, 0);
      else setRunning(false);
    }
    setTimeout(step, 0);
  }

  function handleStop() {
    runId.current++;
    setRunning(false);
  }

  const { done } = tally;
  const avgStop = tally.stopDays.length ? tally.stopDays.reduce((s, d) => s + d, 0) / tally.stopDays.length : null;

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div className="grid min-w-0 gap-3 sm:grid-cols-3">
        <Field label="A/A experiments" value={inputs.experiments} min={10} max={2000} onChange={(v) => update("experiments", v)} />
        <Field label="Planned days" value={inputs.days} min={2} max={60} onChange={(v) => update("days", v)} />
        <Field label="Visitors per variant per day" value={inputs.perDay} min={50} max={5000} onChange={(v) => update("perDay", v)} />
      </div>
      <div className="flex flex-wrap gap-2">
        <Button onClick={handleRun} disabled={running}>
          {running ? "Running…" : `Run ${inputs.experiments} A/A experiments`}
        </Button>
        <Button variant="outline" onClick={handleStop} disabled={!running}>
          Stop
        </Button>
      </div>
      {done > 0 ? (
        <div className="flex min-w-0 flex-col gap-3" aria-live="polite">
          <Progress value={Math.round((done / inputs.experiments) * 100)} aria-label={`${done} of ${inputs.experiments} experiments run`} />
          <div className="grid gap-3 sm:grid-cols-3">
            <p className="rounded-lg border p-3 text-sm">
              <span className="block font-mono text-xl font-medium tabular-nums">{pct(tally.peekWins / done)}</span>
              declared a winner when checking every day and stopping at the first p &lt; {ALPHA}
            </p>
            <p className="rounded-lg border p-3 text-sm">
              <span className="block font-mono text-xl font-medium tabular-nums">{pct(tally.fixedWins / done)}</span>
              declared a winner when testing once, on day {inputs.days}
            </p>
            <p className="rounded-lg border p-3 text-sm">
              <span className="block font-mono text-xl font-medium tabular-nums">{pct(ALPHA)}</span>
              the false positive rate the {ALPHA} significance level promises
            </p>
          </div>
          <p className="text-sm">
            Every one of these {done} experiments compared two identical variants ({pct(BASELINE)} each), so every &quot;winner&quot; is a false positive.
            {avgStop ? ` Peeking stopped on day ${avgStop.toFixed(1)} on average: the daily p-value wanders, and checking it ${inputs.days} times gives it ${inputs.days} chances to dip below ${ALPHA} by luck.` : ""}
          </p>
        </div>
      ) : (
        <p className="text-sm text-foreground/75">Random draws in your browser; each run gives slightly different numbers.</p>
      )}
    </div>
  );
}
