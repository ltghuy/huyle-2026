// A simplified model of a test suite's shape. Every number here is an
// assumption, listed on the page next to the results; nothing is measured.

export type Level = "static" | "unit" | "integration" | "e2e";

export const LEVELS: readonly { id: Level; label: string; max: number; seconds: number; flake: number; upkeepMinutes: number; unit: string }[] = [
  { id: "static", label: "Static checks", max: 6, seconds: 6, flake: 0, upkeepMinutes: 10, unit: "checks" },
  { id: "unit", label: "Unit tests", max: 1000, seconds: 0.01, flake: 0.00002, upkeepMinutes: 0.5, unit: "tests" },
  { id: "integration", label: "Integration tests", max: 600, seconds: 0.2, flake: 0.0002, upkeepMinutes: 1.5, unit: "tests" },
  { id: "e2e", label: "End-to-end tests", max: 300, seconds: 8, flake: 0.004, upkeepMinutes: 6, unit: "tests" },
];

/** Parallel workers the run time is divided by. */
export const WORKERS = 4;

export type Counts = Record<Level, number>;

export const PRESETS: readonly { id: string; label: string; counts: Counts }[] = [
  { id: "pyramid", label: "Pyramid", counts: { static: 3, unit: 600, integration: 80, e2e: 10 } },
  { id: "trophy", label: "Trophy", counts: { static: 4, unit: 120, integration: 250, e2e: 15 } },
  { id: "cone", label: "Ice-cream cone", counts: { static: 0, unit: 30, integration: 20, e2e: 150 } },
];

/** A sample bug and, per level, the chance that one test at that level catches it. */
export const BUGS: readonly { name: string; catch: Partial<Record<Level, number>> }[] = [
  { name: "A string passed where a number is expected", catch: { static: 0.6, unit: 0.002, integration: 0.002 } },
  { name: "A price rounds the wrong way", catch: { unit: 0.01, integration: 0.003, e2e: 0.003 } },
  { name: "The cart reducer forgets to reset on sign-out", catch: { unit: 0.006, integration: 0.008, e2e: 0.01 } },
  { name: "A form shows the error on the wrong field", catch: { integration: 0.01, e2e: 0.02 } },
  { name: "The API renames a field the page reads", catch: { integration: 0.006, e2e: 0.02 } },
  { name: "A banner covers the checkout button on small screens", catch: { e2e: 0.015 } },
  { name: "A route goes missing after a refactor", catch: { static: 0.05, e2e: 0.03 } },
];

export type SuiteResult = {
  total: number;
  runSeconds: number;
  flakeChance: number;
  upkeepHours: number;
  bugs: { name: string; chance: number }[];
};

export function evaluate(counts: Counts): SuiteResult {
  let serial = 0;
  let noFlake = 1;
  let upkeep = 0;
  for (const level of LEVELS) {
    const n = counts[level.id];
    serial += n * level.seconds;
    noFlake *= (1 - level.flake) ** n;
    upkeep += n * level.upkeepMinutes;
  }
  const bugs = BUGS.map((bug) => {
    let missed = 1;
    for (const level of LEVELS) missed *= (1 - (bug.catch[level.id] ?? 0)) ** counts[level.id];
    return { name: bug.name, chance: 1 - missed };
  });
  return {
    total: LEVELS.reduce((sum, level) => sum + counts[level.id], 0),
    runSeconds: serial / WORKERS,
    flakeChance: 1 - noFlake,
    upkeepHours: upkeep / 60,
    bugs,
  };
}
