import { findPath } from "./graph";
import { KIND_LABEL, project, type ProjectKind } from "./repo";

// Module boundary rules for the sample repo, checked the way a lint rule would
// check a new import. One example rule set; teams pick their own layers.

export type EntryPoint = "root" | "subpath" | "deep";

export type Violation = { rule: string; message: string };

export type BoundaryCheck = {
  allowed: boolean;
  internal: boolean;
  specifier: string;
  violations: Violation[];
  cycle: string[] | null;
  reviewers: string[];
};

/** Which kinds each kind may import. Config packages are tooling anyone may use. */
export const ALLOWED: Record<ProjectKind, readonly ProjectKind[]> = {
  app: ["feature", "ui", "data", "util", "config"],
  feature: ["feature", "ui", "data", "util", "config"],
  ui: ["util", "config"],
  data: ["util", "config"],
  util: ["config"],
  config: [],
};

/** One subpath each package lists in its "exports". */
const SUBPATH: Record<string, string> = { ui: "button", api: "hooks", utils: "dates", auth: "session", billing: "checkout" };

const kindWord = (kind: ProjectKind) => (kind === "ui" ? "UI" : KIND_LABEL[kind].toLowerCase());

function withArticle(kind: ProjectKind, capital = false) {
  const article = kind === "app" ? "an" : "a";
  return `${capital ? article[0].toUpperCase() + article.slice(1) : article} ${kindWord(kind)}`;
}

export function specifierFor(to: string, entry: EntryPoint): string {
  const name = project(to).name;
  if (entry === "root") return name;
  if (entry === "subpath") return `${name}/${SUBPATH[to] ?? "client"}`;
  return `${name}/src/internal/helpers`;
}

export function checkImport(from: string, to: string, entry: EntryPoint): BoundaryCheck {
  const source = project(from);
  const target = project(to);
  const specifier = from === to ? "./internal/helpers" : specifierFor(to, entry);
  const reviewers = [source.owners];

  if (from === to) {
    return { allowed: true, internal: true, specifier, violations: [], cycle: null, reviewers };
  }

  const violations: Violation[] = [];
  if (source.kind === "app" && target.kind === "app") {
    violations.push({
      rule: "No app-to-app imports",
      message: `${source.name} is an app and can't import another app. Move the shared code into a package both apps depend on.`,
    });
  } else if (!ALLOWED[source.kind].includes(target.kind)) {
    violations.push({
      rule: "Layer rule",
      message: `${withArticle(source.kind, true)} package may only import ${ALLOWED[source.kind].map(kindWord).join(" or ")} packages; ${target.name} is ${withArticle(target.kind)} package.`,
    });
  }
  if (entry === "deep") {
    violations.push({
      rule: "Public entry points only",
      message: `${specifier} reaches into ${target.name}'s internals. Import from what its package.json "exports" lists, so ${target.name} can refactor freely.`,
    });
  }

  // Would the new edge from → to close a loop? Only if `to` already reaches `from`.
  const back = source.deps.includes(to) ? null : findPath(to, from, (id) => project(id).deps);
  const cycle = back ? [from, ...back] : null;
  if (cycle) {
    violations.push({
      rule: "No cycles",
      message: `${cycle.map((id) => project(id).name).join(" → ")}: the projects would depend on each other, so neither can be built first.`,
    });
  }

  return { allowed: violations.length === 0, internal: false, specifier, violations, cycle, reviewers };
}
