import { CODE_PROJECTS, project, type TaskName } from "./repo";

// A simplified task runner: build the task graph, hash each task's inputs,
// look the hash up in a cache, and schedule what's left on a few workers.
// Mirrors what workspace task runners do, at toy scale.

export type Machine = "laptop" | "ci";
export type CacheMode = "local" | "shared";

export type CacheState = {
  local: Record<Machine, ReadonlySet<string>>;
  remote: ReadonlySet<string>;
};

export const EMPTY_CACHE: CacheState = { local: { laptop: new Set(), ci: new Set() }, remote: new Set() };

export type TaskRun = {
  key: string;
  project: string;
  task: TaskName;
  hash: string;
  status: "ran" | "hit";
  /** Where a hit came from. */
  source?: "local" | "remote";
  start: number;
  end: number;
};

export type RunResult = {
  runs: TaskRun[];
  /** Simulated seconds from start to the last task finishing. */
  total: number;
  /** The same task for every project, nothing cached. */
  baseline: number;
  cache: CacheState;
};

export const WORKERS = 4;
export const HIT_SECONDS = 0.2;

type Node = { key: string; project: string; task: TaskName; deps: string[] };

const taskKey = (projectId: string, task: TaskName) => `${projectId}#${task}`;

/**
 * The tasks needed to run `task` for `projects`: build and test wait for the
 * builds of a project's internal dependencies (`^build`); lint waits for nothing.
 * Dependency builds are pulled in even for projects outside the selection.
 */
export function taskGraph(task: TaskName, projects: Iterable<string>): Node[] {
  const nodes = new Map<string, Node>();
  function add(projectId: string, name: TaskName) {
    const key = taskKey(projectId, name);
    if (nodes.has(key)) return;
    const deps = name === "lint" ? [] : project(projectId).deps.map((d) => taskKey(d, "build"));
    nodes.set(key, { key, project: projectId, task: name, deps });
    if (name !== "lint") for (const d of project(projectId).deps) add(d, "build");
  }
  for (const id of projects) add(id, task);
  return [...nodes.values()];
}

/** FNV-1a, 32-bit, as 8 hex characters: short enough to read, not collision-safe like a real runner's hash. */
export function fnv1a(input: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

const revision = (id: string, changed: ReadonlySet<string>) => `${id}@${changed.has(id) ? "branch" : "main"}`;

/** Hash every node from its inputs: task, own source, the config it reads, and its dependencies' hashes. */
export function hashTasks(nodes: Node[], changed: ReadonlySet<string>): Map<string, string> {
  const byKey = new Map(nodes.map((n) => [n.key, n]));
  const hashes = new Map<string, string>();
  function hashOf(key: string): string {
    const known = hashes.get(key);
    if (known) return known;
    const node = byKey.get(key)!;
    const config = node.task === "lint" ? revision("eslint-config", changed) : revision("tsconfig", changed);
    const inputs = [node.task, revision(node.project, changed), config, ...node.deps.map(hashOf)].join("|");
    const hash = fnv1a(inputs);
    hashes.set(key, hash);
    return hash;
  }
  for (const n of nodes) hashOf(n.key);
  return hashes;
}

/** List scheduling: whenever a worker is free, start the first ready task. */
function schedule(nodes: Node[], duration: (n: Node) => number): Map<string, { start: number; end: number }> {
  const times = new Map<string, { start: number; end: number }>();
  const pending = [...nodes];
  const workers: number[] = Array(WORKERS).fill(0);
  while (pending.length > 0) {
    const free = Math.min(...workers);
    const worker = workers.indexOf(free);
    // Earliest time each pending task could start, given its dependencies.
    let best = -1;
    let bestStart = Infinity;
    pending.forEach((n, i) => {
      if (!n.deps.every((d) => times.has(d))) return;
      const ready = Math.max(free, ...n.deps.map((d) => times.get(d)!.end));
      if (ready < bestStart) {
        bestStart = ready;
        best = i;
      }
    });
    const [node] = pending.splice(best, 1);
    const end = bestStart + duration(node);
    times.set(node.key, { start: bestStart, end });
    workers[worker] = end;
  }
  return times;
}

const round = (n: number) => Math.round(n * 10) / 10;

export function runTasks({
  task,
  projects,
  changed,
  machine,
  mode,
  cache,
}: {
  task: TaskName;
  projects: Iterable<string>;
  changed: ReadonlySet<string>;
  machine: Machine;
  mode: CacheMode;
  cache: CacheState;
}): RunResult {
  const nodes = taskGraph(task, projects);
  const hashes = hashTasks(nodes, changed);
  const local = cache.local[machine];

  const source = new Map<string, "local" | "remote">();
  for (const n of nodes) {
    const hash = hashes.get(n.key)!;
    if (local.has(hash)) source.set(n.key, "local");
    else if (mode === "shared" && cache.remote.has(hash)) source.set(n.key, "remote");
  }

  const times = schedule(nodes, (n) => (source.has(n.key) ? HIT_SECONDS : project(n.project).durations[n.task]));
  const runs: TaskRun[] = nodes
    .map((n) => {
      const t = times.get(n.key)!;
      return {
        key: n.key,
        project: n.project,
        task: n.task,
        hash: hashes.get(n.key)!,
        status: source.has(n.key) ? ("hit" as const) : ("ran" as const),
        source: source.get(n.key),
        start: round(t.start),
        end: round(t.end),
      };
    })
    .sort((a, b) => a.start - b.start || a.key.localeCompare(b.key));

  const all = taskGraph(task, CODE_PROJECTS.map((p) => p.id));
  const baselineTimes = schedule(all, (n) => project(n.project).durations[n.task]);
  const baseline = Math.max(...[...baselineTimes.values()].map((t) => t.end));

  const written = runs.map((r) => r.hash);
  const next: CacheState = {
    local: { ...cache.local, [machine]: new Set([...local, ...written]) },
    remote: mode === "shared" ? new Set([...cache.remote, ...written]) : cache.remote,
  };

  return { runs, total: runs.length ? Math.max(...runs.map((r) => r.end)) : 0, baseline: round(baseline), cache: next };
}
