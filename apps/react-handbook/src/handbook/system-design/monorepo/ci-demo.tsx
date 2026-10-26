"use client";

import { useState } from "react";

import { Choice } from "@/handbook/jwt/token-view";
import { cn } from "@/lib/utils";

import { ASSUMPTIONS, SHARES, SIZES, STRATEGIES, criticalPath, estimate } from "./ci-model";

const SIZE_OPTIONS = SIZES.map((n) => ({ value: String(n), label: `${n} projects` }));
const SHARE_OPTIONS = SHARES.map((s) => ({ value: String(s), label: `${s * 100}%` }));

function minutes(value: number) {
  if (value >= 60) return `${Math.floor(value / 60)} h ${Math.round(value % 60)} min`;
  return `${value < 10 ? value.toFixed(1) : Math.round(value)} min`;
}

export function CiDemo() {
  const [size, setSize] = useState("200");
  const [share, setShare] = useState("0.2");
  const n = Number(size);
  const s = Number(share);
  const values = STRATEGIES.map((strategy) => ({ ...strategy, value: estimate(strategy.id, n, s) }));
  const max = Math.max(...values.map((v) => v.value));

  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <Choice legend="Repo size" value={size} options={SIZE_OPTIONS} onChange={setSize} />
        <Choice legend="Share of projects a typical change reaches" value={share} options={SHARE_OPTIONS} onChange={setShare} />
      </div>

      <figure className="flex flex-col gap-3">
        <figcaption className="text-sm font-medium">
          Estimated CI time per pull request: {n} projects, a change reaching {s * 100}% of them
        </figcaption>
        <ul className="flex flex-col gap-3" aria-live="polite">
          {values.map((v) => (
            <li key={v.id} className="grid gap-1 sm:grid-cols-[12rem_1fr] sm:items-center sm:gap-3">
              <span className="flex flex-col text-sm">
                <span className="font-medium">{v.label}</span>
                <span className="text-xs text-foreground/75">{v.detail}</span>
              </span>
              <span className="flex items-center gap-2">
                <span className="h-3 min-w-0 flex-1">
                  <span
                    className="block h-full rounded-r-[4px] bg-info"
                    style={{ width: `max(3px, ${(v.value / max) * 100}%)` }}
                    title={`${v.label}: ${minutes(v.value)}`}
                  />
                </span>
                <span className="w-24 shrink-0 text-right text-sm font-medium tabular-nums">{minutes(v.value)}</span>
              </span>
            </li>
          ))}
        </ul>
      </figure>

      <div role="region" aria-label="CI time by repo size (scrollable)" tabIndex={0} className="relative overflow-x-auto rounded-lg border outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
        <table className="w-full min-w-[520px] text-sm">
          <caption className="px-3 pt-2 text-left text-xs text-foreground/75">How each strategy grows with the repo, for a change reaching {s * 100}% of projects</caption>
          <thead className="text-left text-xs text-foreground/75">
            <tr>
              <th scope="col" className="px-3 py-2 font-medium">Strategy</th>
              {SIZES.map((size) => (
                <th key={size} scope="col" className={cn("px-3 py-2 text-right font-medium", size === n && "text-foreground")}>
                  {size} projects
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {STRATEGIES.map((strategy) => (
              <tr key={strategy.id} className="border-t">
                <th scope="row" className="px-3 py-1.5 text-left font-normal">
                  {strategy.label}
                </th>
                {SIZES.map((size) => (
                  <td key={size} className={cn("px-3 py-1.5 text-right tabular-nums", size === n && "font-semibold")}>
                    {minutes(estimate(strategy.id, size, s))}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <details className="rounded-lg border p-3 text-xs text-foreground/85">
        <summary className="cursor-pointer text-sm font-medium">The model&apos;s assumptions</summary>
        <ul className="mt-2 flex flex-col gap-1 pl-4">
          <li className="list-disc">
            Each project has build, test and lint, {ASSUMPTIONS.minutesPerProject} min in total; one agent runs {ASSUMPTIONS.coresPerAgent} tasks at a time.
          </li>
          <li className="list-disc">
            The longest chain of dependent tasks is about log₂(projects) + 2 tasks ({minutes(criticalPath(n))} here). No strategy beats it except by caching the tasks on it.
          </li>
          <li className="list-disc">
            The shared cache already has {ASSUMPTIONS.sharedHitRate * 100}% of the affected tasks (from main, an earlier push or a teammate); restoring one costs{" "}
            {ASSUMPTIONS.restoreMinutesPerTask * 60} s.
          </li>
          <li className="list-disc">
            Parallel agents: {ASSUMPTIONS.agents}. Every run pays {ASSUMPTIONS.setupMinutes} min of checkout and install.
          </li>
        </ul>
        <p className="mt-2">A model, not a benchmark: the numbers move with your repo, but the shape doesn&apos;t. Run everything grows with the whole repo, affected runs with the change, and caching and agents cut what remains.</p>
      </details>
    </div>
  );
}
