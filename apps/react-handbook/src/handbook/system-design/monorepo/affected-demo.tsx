"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Choice } from "@/handbook/jwt/token-view";
import { cn } from "@/lib/utils";

import { affected } from "./graph";
import { CODE_PROJECTS, PROJECTS, TASKS, project, type TaskName } from "./repo";
import { RepoGraph, type NodeTone } from "./repo-graph";
import { EMPTY_CACHE, WORKERS, runTasks, type CacheMode, type Machine, type RunResult } from "./runner";

type Scope = "affected" | "all";

const TASK_OPTIONS = TASKS.map((t) => ({ value: t, label: t }));
const SCOPE_OPTIONS = [
  { value: "affected", label: "Affected projects" },
  { value: "all", label: "Every project" },
] as const;
const MACHINE_OPTIONS = [
  { value: "laptop", label: "Your laptop" },
  { value: "ci", label: "CI" },
] as const;
const MODE_OPTIONS = [
  { value: "local", label: "Local cache only" },
  { value: "shared", label: "Shared (remote) cache" },
] as const;

const MACHINE_LABEL: Record<Machine, string> = { laptop: "your laptop", ci: "CI" };

type LastRun = RunResult & { task: TaskName; machine: Machine; scope: Scope; empty: boolean };

export function AffectedDemo() {
  const [changed, setChanged] = useState<ReadonlySet<string>>(() => new Set(["ui"]));
  const [task, setTask] = useState<TaskName>("build");
  const [scope, setScope] = useState<Scope>("affected");
  const [machine, setMachine] = useState<Machine>("laptop");
  const [mode, setMode] = useState<CacheMode>("local");
  const [cache, setCache] = useState(EMPTY_CACHE);
  const [last, setLast] = useState<LastRun | null>(null);

  const hit = affected(changed);
  const affectedCode = CODE_PROJECTS.filter((p) => hit.has(p.id)).map((p) => p.id);

  function toneOf(id: string): NodeTone {
    if (changed.has(id)) return "changed";
    return hit.has(id) ? "affected" : "muted";
  }

  function handleToggle(id: string, checked: boolean) {
    setChanged((current) => {
      const next = new Set(current);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  function handleRun() {
    const projects = scope === "all" ? CODE_PROJECTS.map((p) => p.id) : affectedCode;
    const result = runTasks({ task, projects, changed, machine, mode, cache });
    setCache(result.cache);
    setLast({ ...result, task, machine, scope, empty: projects.length === 0 });
  }

  function handleClear() {
    setCache(EMPTY_CACHE);
    setLast(null);
  }

  return (
    <div className="flex flex-col gap-5">
      <fieldset className="flex min-w-0 flex-col gap-1.5">
        <legend className="mb-1.5 text-xs font-medium text-foreground/75">What your branch changed (compared with main)</legend>
        <div className="flex flex-wrap gap-x-4 gap-y-2">
          {PROJECTS.map((p) => (
            <label key={p.id} className="flex min-h-6 items-center gap-2 text-sm">
              <input type="checkbox" checked={changed.has(p.id)} onChange={(e) => handleToggle(p.id, e.target.checked)} className="size-4 accent-primary" />
              <span className="font-mono text-xs">{p.name}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="flex flex-col gap-2">
        <RepoGraph
          title="Affected projects"
          description={`Changed: ${[...changed].map((id) => project(id).name).join(", ") || "nothing"}. Affected: ${affectedCode.map((id) => project(id).name).join(", ") || "nothing"}.`}
          tone={toneOf}
        />
        <p className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-foreground/75">
          <span className="inline-flex items-center gap-1.5">
            <span aria-hidden className="size-3 rounded-sm border-2 border-primary bg-primary/15" /> changed
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span aria-hidden className="size-3 rounded-sm border-2 border-[color-mix(in_oklch,var(--warning),black_20%)] bg-warning/20 dark:border-warning" /> affected (depends on a change)
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span aria-hidden className="size-3 rounded-sm border-2 border-border" /> unaffected
          </span>
        </p>
        <p className="text-sm" aria-live="polite">
          <strong>
            {affectedCode.length} of {CODE_PROJECTS.length}
          </strong>{" "}
          projects with tasks are affected
          {changed.size === 0 ? ": nothing changed, so there is nothing to rebuild." : "."}
        </p>
      </div>

      <div className="grid gap-4 rounded-lg border p-3 sm:grid-cols-2">
        <Choice legend="Task" value={task} options={TASK_OPTIONS} onChange={setTask} />
        <Choice legend="Run it for" value={scope} options={SCOPE_OPTIONS} onChange={setScope} />
        <Choice legend="Machine" value={machine} options={MACHINE_OPTIONS} onChange={setMachine} />
        <Choice legend="Cache" value={mode} options={MODE_OPTIONS} onChange={setMode} />
        <div className="flex flex-wrap gap-2 sm:col-span-2">
          <Button onClick={handleRun}>
            Run {task} on {MACHINE_LABEL[machine]}
          </Button>
          <Button variant="outline" onClick={handleClear}>
            Clear all caches
          </Button>
        </div>
      </div>

      <RunReport last={last} />
    </div>
  );
}

function RunReport({ last }: { last: LastRun | null }) {
  if (!last) {
    return (
      <p aria-live="polite" className="text-sm text-foreground/75">
        No run yet. Run a task, run it again, then change a package or switch machine.
      </p>
    );
  }
  if (last.empty) {
    return (
      <p aria-live="polite" className="text-sm">
        Nothing is affected, so there is nothing to run: the change can&apos;t reach any project&apos;s {last.task}.
      </p>
    );
  }

  const ran = last.runs.filter((r) => r.status === "ran").length;
  const remote = last.runs.filter((r) => r.source === "remote").length;
  const scale = Math.max(last.total, 1);

  return (
    <div className="flex flex-col gap-3">
      <p aria-live="polite" className="text-sm">
        <strong>{last.runs.length} tasks</strong> on {MACHINE_LABEL[last.machine]}: {ran} ran, {last.runs.length - ran} from cache
        {remote > 0 ? ` (${remote} downloaded from the shared cache)` : ""}. Took <strong>{last.total.toFixed(1)} s</strong> against{" "}
        {last.baseline.toFixed(1)} s to {last.task} every project with no cache ({WORKERS} workers).
      </p>
      <div role="region" aria-label="Task timeline (scrollable)" tabIndex={0} className="relative isolate max-h-80 overflow-auto rounded-lg border outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
        <table className="w-full min-w-[520px] text-xs">
          <caption className="sr-only">Each task of the last run with its hash, result and when it ran</caption>
          <thead className="sticky top-0 bg-card text-left text-foreground/75">
            <tr>
              <th scope="col" className="px-3 py-2 font-medium">Task</th>
              <th scope="col" className="px-3 py-2 font-medium">Hash</th>
              <th scope="col" className="px-3 py-2 font-medium">Result</th>
              <th scope="col" className="w-1/2 px-3 py-2 font-medium">Timeline</th>
            </tr>
          </thead>
          <tbody>
            {last.runs.map((r) => (
              <tr key={r.key} className="border-t">
                <th scope="row" className="px-3 py-1.5 text-left font-mono font-normal whitespace-nowrap">
                  {project(r.project).name}#{r.task}
                </th>
                <td className="px-3 py-1.5 font-mono text-foreground/75">{r.hash}</td>
                <td className={cn("px-3 py-1.5 font-medium whitespace-nowrap", r.status === "hit" ? "text-success" : "text-foreground")}>
                  {r.status === "hit" ? `cache hit (${r.source})` : "ran"}
                </td>
                <td className="px-3 py-1.5">
                  <div className="relative h-3 rounded-sm bg-muted">
                    <div
                      className={cn("absolute inset-y-0 rounded-sm", r.status === "hit" ? "bg-success" : "bg-primary/70")}
                      style={{ left: `${(r.start / scale) * 100}%`, width: `max(2px, ${((r.end - r.start) / scale) * 100}%)` }}
                    />
                  </div>
                  <span className="sr-only">
                    from {r.start} s to {r.end} s
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-foreground/75">
        Simplified: each hash is FNV-1a over the task name, the project&apos;s source revision, the config it reads (tsconfig for build and test, the ESLint config for
        lint) and its dependencies&apos; build hashes. Real runners hash the files themselves, plus the lockfile entries, declared env vars and task config, and restore the saved outputs and logs on a hit.
      </p>
    </div>
  );
}
