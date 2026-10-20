import { CODE_PROJECTS, PROJECTS } from "./repo";

// The sample repo as a file tree, with what belongs at each entry.

export type TreeEntry = {
  path: string;
  depth: number;
  folder: boolean;
  /** Project id when the entry is a project. */
  project?: string;
  purpose: string;
  /** A file inside the entry, used to look up its code owners; none for folders that hold several teams' projects. */
  ownerProbe?: string;
};

const PROJECT_PURPOSE: Record<string, string> = {
  web: "The customer-facing app. It composes feature packages into pages and owns its routes, its deploy and its env vars.",
  admin: "The internal tool. Same rules as any app: it can use every package, and nothing may import it.",
  marketing: "The public site. It uses only the UI kit and utilities, so most changes elsewhere never rebuild it.",
  auth: "Sign-in and session logic shared by web and admin. A feature package holds one business capability with its UI and data hooks.",
  billing: "Checkout and invoices. It builds on auth, which is allowed because both sit in the feature layer.",
  ui: "The design system: components and tokens with no business logic and no data fetching, so any app can use it.",
  api: "The typed client for the backend. Apps and features call it; the UI kit never does.",
  utils: "Small pure helpers (dates, formatting). It depends on nothing, so it sits at the bottom of the graph.",
  tsconfig: "Base TypeScript configs that every project extends. Shipping config as a package gives it a version and an owner.",
  "eslint-config": "The shared lint rules, including the boundary rules. Projects extend it instead of copying rules.",
};

const ROOT: TreeEntry[] = [
  {
    path: "package.json",
    depth: 0,
    folder: false,
    purpose: "Root scripts that call the task runner, dev tooling, and a pinned packageManager version. No app code and no runtime dependencies live here.",
    ownerProbe: "package.json",
  },
  {
    path: "pnpm-workspace.yaml",
    depth: 0,
    folder: false,
    purpose: "Which folders hold workspace projects (apps/*, packages/*), plus the catalog of shared third-party versions.",
    ownerProbe: "pnpm-workspace.yaml",
  },
  {
    path: "turbo.json",
    depth: 0,
    folder: false,
    purpose: "The task pipeline: what each task depends on, its outputs and the env vars that go into its hash. nx.json plays the same role in an Nx repo.",
    ownerProbe: "turbo.json",
  },
  {
    path: ".github/CODEOWNERS",
    depth: 0,
    folder: false,
    purpose: "Maps paths to the teams that must review changes to them. The platform team owns it, so ownership changes get reviewed too.",
    ownerProbe: ".github/CODEOWNERS",
  },
  {
    path: ".changeset/",
    depth: 0,
    folder: true,
    purpose: "Pending release notes, one small file per change to a published package. The release step turns them into versions and changelogs.",
    ownerProbe: ".changeset/config.json",
  },
];

function projectEntry(id: string): TreeEntry {
  const p = PROJECTS.find((x) => x.id === id)!;
  return { path: `${p.path}/`, depth: 1, folder: true, project: id, purpose: PROJECT_PURPOSE[id], ownerProbe: `${p.path}/package.json` };
}

export const TREE: readonly TreeEntry[] = [
  ...ROOT,
  {
    path: "apps/",
    depth: 0,
    folder: true,
    purpose: "Deployable apps. Each one builds and ships on its own, and nothing imports an app.",
  },
  ...CODE_PROJECTS.filter((p) => p.kind === "app").map((p) => projectEntry(p.id)),
  {
    path: "packages/",
    depth: 0,
    folder: true,
    purpose: "Everything shared: features, the UI kit, the API client, utilities and config. Each package has one purpose, its own package.json and an exports field.",
  },
  ...PROJECTS.filter((p) => p.kind !== "app").map((p) => projectEntry(p.id)),
];
