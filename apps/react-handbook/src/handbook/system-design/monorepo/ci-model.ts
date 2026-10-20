// A back-of-the-envelope model of CI time per pull request as a monorepo
// grows. The assumptions are shown on the page; change them and the shape
// holds, the numbers don't.

export const ASSUMPTIONS = {
  /** build + test + lint per project, in minutes. */
  minutesPerProject: 3,
  /** Minutes the longest single task takes (no task can be split). */
  minutesPerTask: 1,
  coresPerAgent: 4,
  agents: 6,
  /** Share of an affected project's tasks someone already ran (an earlier push, main, a teammate). */
  sharedHitRate: 0.6,
  setupMinutes: 1.5,
  restoreMinutesPerTask: 0.02,
} as const;

export type Strategy = "everything" | "affected" | "cache" | "agents";

export const STRATEGIES: readonly { id: Strategy; label: string; detail: string }[] = [
  { id: "everything", label: "Run everything", detail: "Every task of every project on one agent" },
  { id: "affected", label: "Affected only", detail: "Only projects the change can reach" },
  { id: "cache", label: "Affected + shared cache", detail: "Skip tasks whose hash is already in the remote cache" },
  { id: "agents", label: "+ parallel agents", detail: `Spread the rest over ${ASSUMPTIONS.agents} agents` },
];

export const SIZES = [10, 50, 200, 1000] as const;
export const SHARES = [0.05, 0.2, 0.5, 1] as const;

/** Longest chain of dependent tasks: grows roughly with the log of the repo size. */
export function criticalPath(projects: number): number {
  return (Math.log2(projects) + 2) * ASSUMPTIONS.minutesPerTask;
}

export function estimate(strategy: Strategy, projects: number, share: number): number {
  const a = ASSUMPTIONS;
  const work = projects * a.minutesPerProject;
  const affected = work * share;
  const tasks = projects * share * 3;
  const floor = criticalPath(projects);
  // What's left to run once the shared cache has served its hits; cached
  // tasks on the longest chain restore instantly, so the chain shrinks too.
  const remaining = affected * (1 - a.sharedHitRate);
  const cachedFloor = floor * (1 - a.sharedHitRate);
  switch (strategy) {
    case "everything":
      return a.setupMinutes + Math.max(work / a.coresPerAgent, floor);
    case "affected":
      return a.setupMinutes + Math.max(affected / a.coresPerAgent, Math.min(floor, affected));
    case "cache":
      return a.setupMinutes + tasks * a.restoreMinutesPerTask + Math.max(remaining / a.coresPerAgent, Math.min(cachedFloor, remaining));
    case "agents":
      return a.setupMinutes + (tasks * a.restoreMinutesPerTask) / a.agents + Math.max(remaining / (a.coresPerAgent * a.agents), Math.min(cachedFloor, remaining));
  }
}
