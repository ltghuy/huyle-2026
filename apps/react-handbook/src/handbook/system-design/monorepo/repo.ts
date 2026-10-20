// The sample repository every monorepo demo works on: three apps sharing
// features, UI, a data client, utilities and config. One example layout.

export type ProjectKind = "app" | "feature" | "ui" | "data" | "util" | "config";

export type TaskName = "build" | "test" | "lint";

export type Project = {
  id: string;
  name: string;
  path: string;
  kind: ProjectKind;
  /** Internal dependencies (project ids), config packages excluded: every project uses them. */
  deps: string[];
  owners: string;
  /** Published to a registry (has a version) or private to the repo. */
  published: boolean;
  version?: string;
  /** Simulated seconds per task when it actually runs. */
  durations: Record<TaskName, number>;
};

export const TASKS: readonly TaskName[] = ["build", "test", "lint"];

export const KIND_LABEL: Record<ProjectKind, string> = {
  app: "App",
  feature: "Feature",
  ui: "UI",
  data: "Data",
  util: "Utility",
  config: "Config",
};

export const PROJECTS: readonly Project[] = [
  { id: "web", name: "web", path: "apps/web", kind: "app", deps: ["auth", "billing", "ui", "utils"], owners: "@acme/web-team", published: false, durations: { build: 42, test: 18, lint: 6 } },
  { id: "admin", name: "admin", path: "apps/admin", kind: "app", deps: ["auth", "ui", "api", "utils"], owners: "@acme/internal-tools", published: false, durations: { build: 30, test: 12, lint: 5 } },
  { id: "marketing", name: "marketing", path: "apps/marketing", kind: "app", deps: ["ui", "utils"], owners: "@acme/growth", published: false, durations: { build: 24, test: 6, lint: 4 } },
  { id: "auth", name: "@acme/auth", path: "packages/auth", kind: "feature", deps: ["ui", "api", "utils"], owners: "@acme/identity", published: false, durations: { build: 10, test: 9, lint: 3 } },
  { id: "billing", name: "@acme/billing", path: "packages/billing", kind: "feature", deps: ["auth", "ui", "api", "utils"], owners: "@acme/payments", published: false, durations: { build: 12, test: 11, lint: 3 } },
  { id: "ui", name: "@acme/ui", path: "packages/ui", kind: "ui", deps: ["utils"], owners: "@acme/design-system", published: true, version: "2.3.0", durations: { build: 16, test: 14, lint: 4 } },
  { id: "api", name: "@acme/api-client", path: "packages/api-client", kind: "data", deps: ["utils"], owners: "@acme/platform", published: true, version: "0.9.1", durations: { build: 8, test: 7, lint: 2 } },
  { id: "utils", name: "@acme/utils", path: "packages/utils", kind: "util", deps: [], owners: "@acme/platform", published: true, version: "1.4.2", durations: { build: 5, test: 4, lint: 2 } },
  { id: "tsconfig", name: "@acme/tsconfig", path: "packages/tsconfig", kind: "config", deps: [], owners: "@acme/platform", published: false, durations: { build: 0, test: 0, lint: 0 } },
  { id: "eslint-config", name: "@acme/eslint-config", path: "packages/eslint-config", kind: "config", deps: [], owners: "@acme/platform", published: false, durations: { build: 0, test: 0, lint: 0 } },
];

export const CONFIG_IDS = PROJECTS.filter((p) => p.kind === "config").map((p) => p.id);

/** Projects that run tasks (config packages have nothing to build). */
export const CODE_PROJECTS = PROJECTS.filter((p) => p.kind !== "config");

const BY_ID = new Map(PROJECTS.map((p) => [p.id, p]));

export function project(id: string): Project {
  const found = BY_ID.get(id);
  if (!found) throw new Error(`Unknown project ${id}`);
  return found;
}

/** Every internal dependency, with the config packages every code project uses. */
export function allDeps(id: string): string[] {
  const p = project(id);
  return p.kind === "config" ? [] : [...p.deps, ...CONFIG_IDS];
}
