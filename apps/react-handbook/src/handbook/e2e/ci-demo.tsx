"use client";

import { useId, useState } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// A simplified model of an end-to-end run in CI; every input is the reader's.

type Inputs = { tests: number; seconds: number; workers: number; machines: number; setup: number; flakyPct: number; retries: number };

const START: Inputs = { tests: 400, seconds: 12, workers: 4, machines: 1, setup: 90, flakyPct: 2, retries: 2 };

const FIELDS: readonly { key: keyof Inputs; label: string; min: number; max: number }[] = [
  { key: "tests", label: "Tests", min: 1, max: 5000 },
  { key: "seconds", label: "Average seconds per test", min: 1, max: 120 },
  { key: "workers", label: "Workers per machine", min: 1, max: 16 },
  { key: "machines", label: "Machines (shards)", min: 1, max: 32 },
  { key: "setup", label: "Setup per machine (s)", min: 0, max: 900 },
  { key: "flakyPct", label: "Tests that fail at random (%)", min: 0, max: 50 },
  { key: "retries", label: "Retries", min: 0, max: 5 },
];

function minutes(seconds: number) {
  return seconds < 120 ? `${Math.round(seconds)} s` : `${(seconds / 60).toFixed(1)} min`;
}

function evaluate(i: Inputs) {
  const slots = i.workers * i.machines;
  const testTime = Math.ceil(i.tests / slots) * i.seconds;
  const flaky = Math.round((i.tests * i.flakyPct) / 100);
  // A flaky test that fails is run again, up to `retries` times; on average about one extra run each.
  const retried = i.retries > 0 ? Math.ceil(flaky / slots) * i.seconds : 0;
  return {
    wall: i.setup + testTime + retried,
    machineMinutes: (i.machines * (i.setup + testTime + retried)) / 60,
    flaky,
    redWithoutRetries: i.flakyPct > 0 ? 1 - (1 - i.flakyPct / 100 / 2) ** i.tests : 0,
  };
}

function Field({ field, value, onChange }: { field: (typeof FIELDS)[number]; value: number; onChange: (key: keyof Inputs, value: number) => void }) {
  const id = useId();
  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const next = Math.round(Number(event.target.value));
    onChange(field.key, Number.isFinite(next) ? Math.min(Math.max(next, field.min), field.max) : field.min);
  }
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <Label htmlFor={id}>{field.label}</Label>
      <Input id={id} type="number" inputMode="numeric" min={field.min} max={field.max} value={value} onChange={handleChange} />
    </div>
  );
}

export function CiDemo() {
  const [inputs, setInputs] = useState(START);
  const result = evaluate(inputs);

  function handleChange(key: keyof Inputs, value: number) {
    setInputs((current) => ({ ...current, [key]: value }));
  }

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div className="grid min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {FIELDS.map((field) => (
          <Field key={field.key} field={field} value={inputs[field.key]} onChange={handleChange} />
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-3" aria-live="polite">
        <p className="rounded-lg border p-3 text-sm">
          <span className="block font-mono text-xl font-medium tabular-nums">{minutes(result.wall)}</span>
          until the pull request hears back
        </p>
        <p className="rounded-lg border p-3 text-sm">
          <span className="block font-mono text-xl font-medium tabular-nums">{result.machineMinutes.toFixed(0)} min</span>
          of machine time per run
        </p>
        <p className="rounded-lg border p-3 text-sm">
          <span className="block font-mono text-xl font-medium tabular-nums">{Math.round(result.redWithoutRetries * 100)}%</span>
          of runs would fail for no reason without retries ({result.flaky} flaky tests)
        </p>
      </div>
      <p className="text-xs text-foreground/75">
        Simplified model: tests split evenly over all workers on all machines; each machine pays its setup (install, build, start the app) once; a flaky test fails half its runs, and each retried one costs about one extra test time.
        Retries hide the noise from the result, not from the bill.
      </p>
    </div>
  );
}
