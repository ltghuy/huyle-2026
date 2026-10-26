import type { Project } from "../projects";

// Module resolution, as Node.js and bundlers do it, over a virtual file
// system: relative paths try extensions and index files; bare names are looked
// up in node_modules, where a package's "exports" map (if any) decides which
// file a subpath means, by matching its conditions in key order.

export type Environment = "browser" | "node";
export type ImportKind = "import" | "require";
export type Conditions = { environment: Environment; kind: ImportKind };

export type ResolveStep = { text: string; outcome: "miss" | "hit" | "info" | "skip" };

export type Resolution = { ok: true; path: string; steps: ResolveStep[] } | { ok: false; error: string; steps: ResolveStep[] };

export const EXTENSIONS = [".ts", ".tsx", ".js", ".mjs", ".json"];

export function dirname(path: string) {
  const i = path.lastIndexOf("/");
  return i === -1 ? "" : path.slice(0, i);
}

export function normalize(path: string) {
  const out: string[] = [];
  for (const part of path.split("/")) {
    if (part === "" || part === ".") continue;
    if (part === "..") out.pop();
    else out.push(part);
  }
  return out.join("/");
}

function join(...parts: string[]) {
  return normalize(parts.filter(Boolean).join("/"));
}

/** Active conditions in the order bundlers add them; "default" always matches. */
export function activeConditions(c: Conditions): string[] {
  return [c.environment, c.kind, "default"];
}

class Resolver {
  readonly steps: ResolveStep[] = [];

  constructor(
    private readonly files: Project,
    private readonly conditions: Conditions,
  ) {}

  private exists(path: string) {
    const found = path in this.files;
    this.steps.push({ text: path, outcome: found ? "hit" : "miss" });
    return found;
  }

  /** A path as a file, then with each extension, then as a directory with an index file. */
  file(target: string): string | null {
    if (this.exists(target)) return target;
    for (const ext of EXTENSIONS) if (this.exists(target + ext)) return target + ext;
    for (const ext of EXTENSIONS) if (this.exists(`${target}/index${ext}`)) return `${target}/index${ext}`;
    return null;
  }

  relative(importer: string, specifier: string): Resolution {
    const target = join(dirname(importer), specifier);
    this.steps.push({ text: `Relative to ${dirname(importer) || "the root"}: ${target}`, outcome: "info" });
    const path = this.file(target);
    return path ? { ok: true, path, steps: this.steps } : { ok: false, error: `Module not found: Can't resolve '${specifier}' in '${dirname(importer)}'`, steps: this.steps };
  }

  bare(importer: string, specifier: string): Resolution {
    const parts = specifier.split("/");
    const name = specifier.startsWith("@") ? parts.slice(0, 2).join("/") : parts[0];
    const subpath = "." + specifier.slice(name.length);

    // Look for node_modules/<name> in the importer's folder, then each parent.
    let dir = dirname(importer);
    let packageDir: string | null = null;
    for (;;) {
      const candidate = join(dir, "node_modules", name);
      if (this.exists(`${candidate}/package.json`)) {
        packageDir = candidate;
        break;
      }
      if (!dir) break;
      dir = dirname(dir);
    }
    if (!packageDir) return { ok: false, error: `Module not found: Can't resolve '${specifier}' (no node_modules/${name})`, steps: this.steps };

    let pkg: Record<string, unknown>;
    try {
      pkg = JSON.parse(this.files[`${packageDir}/package.json`]);
    } catch {
      return { ok: false, error: `${packageDir}/package.json is not valid JSON`, steps: this.steps };
    }

    if (pkg.exports !== undefined) {
      this.steps.push({ text: `package.json has "exports": only the subpaths it lists can be imported`, outcome: "info" });
      const target = this.exportsTarget(pkg.exports, subpath);
      if (target === null) return { ok: false, error: `Package subpath '${subpath}' is not defined by "exports" in ${packageDir}/package.json`, steps: this.steps };
      const path = join(packageDir, target);
      return this.exists(path) ? { ok: true, path, steps: this.steps } : { ok: false, error: `"exports" points at ${path}, which doesn't exist`, steps: this.steps };
    }

    if (subpath !== ".") {
      const path = this.file(join(packageDir, subpath));
      return path ? { ok: true, path, steps: this.steps } : { ok: false, error: `Module not found: Can't resolve '${specifier}'`, steps: this.steps };
    }

    // No exports map: fall back to the main fields, in the bundler's order for this environment.
    const fields = this.conditions.environment === "browser" ? ["browser", "module", "main"] : ["module", "main"];
    this.steps.push({ text: `No "exports": try the fields ${fields.map((f) => `"${f}"`).join(", ")} in order`, outcome: "info" });
    for (const field of fields) {
      const value = pkg[field];
      if (typeof value !== "string") {
        this.steps.push({ text: `"${field}": not set`, outcome: "skip" });
        continue;
      }
      this.steps.push({ text: `"${field}": "${value}"`, outcome: "info" });
      const path = this.file(join(packageDir, value));
      if (path) return { ok: true, path, steps: this.steps };
    }
    const path = this.file(join(packageDir, "index"));
    return path ? { ok: true, path, steps: this.steps } : { ok: false, error: `Module not found: Can't resolve '${specifier}'`, steps: this.steps };
  }

  /** The target an exports map gives a subpath: exact keys first, then the longest matching `*` pattern. */
  private exportsTarget(exports: unknown, subpath: string): string | null {
    const isConditionsOnly = typeof exports === "string" || Array.isArray(exports) || (typeof exports === "object" && exports !== null && !Object.keys(exports).some((k) => k.startsWith(".")));
    const map: Record<string, unknown> = isConditionsOnly ? { ".": exports } : (exports as Record<string, unknown>);
    if (subpath in map) {
      this.steps.push({ text: `"exports" key "${subpath}" matches`, outcome: "hit" });
      return this.conditional(map[subpath], null);
    }
    const patterns = Object.keys(map)
      .filter((k) => k.includes("*"))
      .sort((a, b) => b.indexOf("*") - a.indexOf("*"));
    for (const key of patterns) {
      const [prefix, suffix] = key.split("*");
      if (subpath.startsWith(prefix) && subpath.endsWith(suffix) && subpath.length >= key.length - 1) {
        const star = subpath.slice(prefix.length, subpath.length - suffix.length);
        this.steps.push({ text: `"exports" pattern "${key}" matches, * = "${star}"`, outcome: "hit" });
        return this.conditional(map[key], star);
      }
    }
    this.steps.push({ text: `No "exports" key or pattern matches "${subpath}"`, outcome: "miss" });
    return null;
  }

  /** Walks nested condition objects in key order; the first key that is active wins. */
  private conditional(value: unknown, star: string | null): string | null {
    if (typeof value === "string") return star === null ? value : value.replaceAll("*", star);
    if (Array.isArray(value)) {
      for (const item of value) {
        const target = this.conditional(item, star);
        if (target) return target;
      }
      return null;
    }
    if (typeof value === "object" && value !== null) {
      const active = activeConditions(this.conditions);
      for (const [condition, target] of Object.entries(value)) {
        if (!active.includes(condition)) {
          this.steps.push({ text: `condition "${condition}": not active, skip`, outcome: "skip" });
          continue;
        }
        this.steps.push({ text: `condition "${condition}": active, use it`, outcome: "hit" });
        const resolved = this.conditional(target, star);
        if (resolved) return resolved;
      }
      return null;
    }
    return null;
  }
}

export function resolve(files: Project, importer: string, specifier: string, conditions: Conditions): Resolution {
  const resolver = new Resolver(files, conditions);
  if (!specifier) return { ok: false, error: "Empty specifier", steps: [] };
  if (specifier.startsWith("./") || specifier.startsWith("../") || specifier.startsWith("/")) return resolver.relative(importer, specifier);
  return resolver.bare(importer, specifier);
}
