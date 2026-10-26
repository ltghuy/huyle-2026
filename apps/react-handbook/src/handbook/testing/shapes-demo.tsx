"use client";

import { useId, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";

import { BUGS, type Counts, evaluate, type Level, LEVELS, PRESETS, WORKERS } from "./suite-model";

const NUMBER = new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 });

function formatSeconds(seconds: number) {
  return seconds < 90 ? `${NUMBER.format(seconds)} s` : `${NUMBER.format(seconds / 60)} min`;
}

function percent(chance: number) {
  return `${Math.round(chance * 100)}%`;
}

function CountField({ level, value, onChange }: { level: (typeof LEVELS)[number]; value: number; onChange: (id: Level, value: number) => void }) {
  const id = useId();
  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const next = Math.round(Number(event.target.value));
    onChange(level.id, Number.isFinite(next) ? Math.min(Math.max(next, 0), level.max) : 0);
  }
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <label htmlFor={id} className="text-xs font-medium text-foreground/75">
        {level.label} ({level.unit}, 0 to {level.max})
      </label>
      <Input id={id} type="number" inputMode="numeric" min={0} max={level.max} step={1} value={value} onChange={handleChange} />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 rounded-lg border p-3">
      <span className="text-xs text-foreground/75">{label}</span>
      <span className="font-mono text-lg font-medium tabular-nums">{value}</span>
    </div>
  );
}

export function ShapesDemo() {
  const [counts, setCounts] = useState<Counts>(PRESETS[0].counts);
  const result = evaluate(counts);
  const preset = PRESETS.find((p) => LEVELS.every((l) => p.counts[l.id] === counts[l.id]));

  function handleCount(id: Level, value: number) {
    setCounts((current) => ({ ...current, [id]: value }));
  }

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-foreground/75">Presets:</span>
        {PRESETS.map((p) => (
          <Button key={p.id} size="sm" variant={preset?.id === p.id ? "default" : "outline"} aria-pressed={preset?.id === p.id} onClick={() => setCounts(p.counts)}>
            {p.label}
          </Button>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {LEVELS.map((level) => (
          <CountField key={level.id} level={level} value={counts[level.id]} onChange={handleCount} />
        ))}
      </div>

      <p className="text-xs text-foreground/75">Simplified model. The numbers come from the assumptions listed below, not from a real suite.</p>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-live="polite">
        <Stat label="Tests and checks" value={NUMBER.format(result.total)} />
        <Stat label={`Run time (${WORKERS} workers)`} value={formatSeconds(result.runSeconds)} />
        <Stat label="Runs that fail for no reason" value={percent(result.flakeChance)} />
        <Stat label="Upkeep per month" value={`${NUMBER.format(result.upkeepHours)} h`} />
      </div>

      <div className="flex min-w-0 flex-col gap-2">
        <h4 className="text-sm font-medium">Chance this suite catches each sample bug</h4>
        {result.total === 0 ? (
          <p className="text-sm text-foreground/75">With no tests and no checks, nothing is caught: every bug below reaches users.</p>
        ) : null}
        <ul className="flex flex-col gap-2.5">
          {result.bugs.map((bug) => (
            <li key={bug.name} className="grid min-w-0 gap-1 sm:grid-cols-[minmax(0,1fr)_10rem] sm:items-center sm:gap-4">
              <span className="min-w-0 text-sm">{bug.name}</span>
              <span className="flex items-center gap-2">
                <Progress value={Math.round(bug.chance * 100)} aria-label={`${bug.name}: ${percent(bug.chance)} chance to catch`} className="flex-1" />
                <span className="w-10 text-right font-mono text-xs tabular-nums">{percent(bug.chance)}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>

      <details className="text-sm">
        <summary className="cursor-pointer rounded-sm font-medium outline-none focus-visible:ring-3 focus-visible:ring-ring/50">Assumptions behind the model</summary>
        <div className="relative mt-2 overflow-x-auto" role="region" aria-label="Model assumptions per level" tabIndex={0}>
          <table className="w-full min-w-[32rem] text-left text-xs">
            <thead>
              <tr className="border-b">
                <th className="py-1.5 pr-3 font-medium">Level</th>
                <th className="py-1.5 pr-3 font-medium">Time each</th>
                <th className="py-1.5 pr-3 font-medium">Fails for no reason, per run</th>
                <th className="py-1.5 font-medium">Upkeep each, per month</th>
              </tr>
            </thead>
            <tbody>
              {LEVELS.map((level) => (
                <tr key={level.id} className="border-b last:border-0">
                  <td className="py-1.5 pr-3">{level.label}</td>
                  <td className="py-1.5 pr-3 font-mono tabular-nums">{level.seconds} s</td>
                  <td className="py-1.5 pr-3 font-mono tabular-nums">{level.flake === 0 ? "never" : `1 in ${NUMBER.format(1 / level.flake)}`}</td>
                  <td className="py-1.5 font-mono tabular-nums">{level.upkeepMinutes} min</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-foreground/75">
          Each test at a level that can see a bug catches it with a small fixed chance (for example 1 in 100 for a unit test and a rounding bug), so more tests at the right level raise the chance.
          Run time is the total divided by {WORKERS} parallel workers. The {BUGS.length} bugs and their chances are illustrative.
        </p>
      </details>
    </div>
  );
}
