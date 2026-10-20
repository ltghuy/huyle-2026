// What the common JS monorepo tools do, as of the research date. Facts come
// from .artifacts/research/monorepo-tooling.md; update both together.

export const RESEARCHED = "October 2026";

export type Level = "yes" | "partial" | "no";

export type Capability = "linking" | "graph" | "local-cache" | "remote-cache" | "affected" | "boundaries" | "generators" | "release";

export const CAPABILITIES: readonly { id: Capability; label: string; detail: string }[] = [
  { id: "linking", label: "Workspaces and linking", detail: "Install once, link local packages to each other" },
  { id: "graph", label: "Task graph", detail: "Run a task in dependency order (build deps first)" },
  { id: "local-cache", label: "Local task cache", detail: "Skip a task whose inputs haven't changed" },
  { id: "remote-cache", label: "Shared (remote) cache", detail: "Reuse results built by CI or a teammate" },
  { id: "affected", label: "Affected runs", detail: "Only run what a change can reach" },
  { id: "boundaries", label: "Boundary rules", detail: "Reject imports that cross layers or teams" },
  { id: "generators", label: "Code generators", detail: "Scaffold a new package the house way" },
  { id: "release", label: "Versioning and release", detail: "Bump versions, write changelogs, publish" },
];

export type ToolId = "pnpm" | "npm" | "turborepo" | "nx" | "changesets";

export type Tool = { id: ToolId; name: string; role: string; version: string; cells: Record<Capability, { level: Level; note: string }> };

const none = { level: "no", note: "Not its job" } as const;

export const TOOLS: readonly Tool[] = [
  {
    id: "pnpm",
    name: "pnpm workspaces",
    role: "Package manager",
    version: "12.14",
    cells: {
      linking: { level: "yes", note: "workspace: protocol, rewritten to a real version on publish; catalogs for shared versions" },
      graph: { level: "partial", note: "pnpm -r runs scripts in topological order, with no task-level dependencies" },
      "local-cache": none,
      "remote-cache": none,
      affected: { level: "partial", note: '--filter "...[origin/main]" selects changed packages and their dependents' },
      boundaries: { level: "no", note: "Strict node_modules blocks undeclared dependencies, not layer rules" },
      generators: none,
      release: { level: "no", note: "Publishes (pnpm -r publish) but doesn't bump versions" },
    },
  },
  {
    id: "npm",
    name: "npm workspaces",
    role: "Package manager",
    version: "12.2",
    cells: {
      linking: { level: "partial", note: "Symlinks workspaces into node_modules; no workspace: protocol" },
      graph: { level: "no", note: "--workspaces runs in package.json order, not dependency order" },
      "local-cache": none,
      "remote-cache": none,
      affected: none,
      boundaries: none,
      generators: { level: "partial", note: "npm init -w scaffolds an empty workspace" },
      release: none,
    },
  },
  {
    id: "turborepo",
    name: "Turborepo",
    role: "Task runner",
    version: "2.11",
    cells: {
      linking: { level: "no", note: "Uses the package manager's workspaces" },
      graph: { level: "yes", note: 'dependsOn: ["^build"] runs dependencies first' },
      "local-cache": { level: "yes", note: "Hashes inputs; a hit restores outputs and replays logs" },
      "remote-cache": { level: "yes", note: "Vercel Remote Cache, or self-host the open Remote Caching API" },
      affected: { level: "yes", note: "--affected (changed packages and their dependents vs main)" },
      boundaries: { level: "partial", note: "turbo boundaries is experimental: undeclared imports, tag allow/deny rules" },
      generators: { level: "yes", note: "turbo gen workspace, plus custom generators" },
      release: { level: "no", note: "Its docs point to Changesets" },
    },
  },
  {
    id: "nx",
    name: "Nx",
    role: "Task runner + plugins",
    version: "23.3",
    cells: {
      linking: { level: "partial", note: "Uses package-manager workspaces or TypeScript path aliases" },
      graph: { level: "yes", note: "dependsOn per target or in targetDefaults" },
      "local-cache": { level: "yes", note: "Hashes inputs; a hit restores outputs and replays logs" },
      "remote-cache": { level: "yes", note: "Nx Cloud, or a self-hosted server built to its OpenAPI spec" },
      affected: { level: "yes", note: "nx affected -t <task> with --base/--head" },
      boundaries: { level: "yes", note: "enforce-module-boundaries lint rule with project tags" },
      generators: { level: "yes", note: "nx g, from plugins or local generators" },
      release: { level: "yes", note: "nx release: version, changelog and publish" },
    },
  },
  {
    id: "changesets",
    name: "Changesets",
    role: "Release tool",
    version: "3.0",
    cells: {
      linking: none,
      graph: none,
      "local-cache": none,
      "remote-cache": none,
      affected: none,
      boundaries: none,
      generators: none,
      release: { level: "yes", note: "Change files → version bumps, dependent bumps and changelogs; fixed and linked groups" },
    },
  },
];

/** Common ways to combine the tools, checked against the reader's needs. */
export const STACKS: readonly { name: string; tools: readonly ToolId[] }[] = [
  { name: "pnpm workspaces alone", tools: ["pnpm"] },
  { name: "pnpm + Turborepo + Changesets", tools: ["pnpm", "turborepo", "changesets"] },
  { name: "pnpm + Nx", tools: ["pnpm", "nx"] },
  { name: "npm workspaces + Changesets", tools: ["npm", "changesets"] },
];

const RANK: Record<Level, number> = { no: 0, partial: 1, yes: 2 };

/** The best level any tool in the stack offers for a capability. */
export function stackLevel(tools: readonly ToolId[], capability: Capability): Level {
  let best: Level = "no";
  for (const id of tools) {
    const level = TOOLS.find((t) => t.id === id)!.cells[capability].level;
    if (RANK[level] > RANK[best]) best = level;
  }
  return best;
}
