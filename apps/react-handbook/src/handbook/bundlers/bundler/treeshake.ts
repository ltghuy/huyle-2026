import type { Statement } from "@/handbook/transpiling/compiler/ast";

import type { Project } from "../projects";
import { type Graph, type ModuleRecord, patternNames } from "./graph";

// Tree shaking, statement by statement: start from the entry, follow only the
// exports that are actually imported, keep the statements that define them
// (and whatever those statements use), and keep any top-level code that might
// have a side effect. A module none of whose exports are used is dropped only
// if it has no side effects, or its package.json promises "sideEffects": false.

export type ModuleReport = {
  path: string;
  included: boolean;
  reason: string;
  exports: { name: string; used: boolean }[];
  sideEffects: boolean;
};

export type TreeShakeResult = {
  keep: Map<string, Set<number>>;
  usedExports: Map<string, Set<string>>;
  report: ModuleReport[];
};

type Info = {
  declares: string[];
  refs: string[];
  sideEffect: boolean;
};

/** Names read as values inside a node (not property names, not names being declared). */
function references(node: unknown, out: Set<string>) {
  if (Array.isArray(node)) return node.forEach((n) => references(n, out));
  if (!node || typeof node !== "object") return;
  const n = node as { type: string } & Record<string, unknown>;
  switch (n.type) {
    case "Identifier":
      out.add(n.name as string);
      return;
    case "MemberExpression":
      references(n.object, out);
      if (n.computed) references(n.property, out);
      return;
    case "ObjectProperty":
      if (n.computed) references(n.key, out);
      references(n.value, out);
      return;
    case "VariableDeclarator":
      patternDefaults(n.id, out);
      references(n.init, out);
      return;
    case "FunctionDeclaration":
    case "ArrowFunctionExpression":
      (n.params as unknown[]).forEach((p) => patternDefaults(p, out));
      references(n.body, out);
      return;
    default:
      for (const [k, v] of Object.entries(n)) if (k !== "type" && k !== "start" && k !== "end") references(v, out);
  }
}

/** Inside a binding pattern only default values are reads. */
function patternDefaults(p: unknown, out: Set<string>) {
  const n = p as { type: string } & Record<string, unknown>;
  if (n.type === "AssignmentPattern") {
    patternDefaults(n.left, out);
    references(n.right, out);
  } else if (n.type === "ObjectPattern") (n.properties as unknown[]).forEach((prop) => patternDefaults((prop as Record<string, unknown>).value ?? (prop as Record<string, unknown>).argument, out));
  else if (n.type === "ArrayPattern") (n.elements as unknown[]).forEach((e) => e && patternDefaults(e, out));
}

function isPure(source: string, start: number) {
  const before = source.slice(0, start).trimEnd();
  if (!before.endsWith("*/")) return false;
  const comment = before.slice(before.lastIndexOf("/*"));
  return comment.includes("#__PURE__") || comment.includes("@__PURE__");
}

/** Whether evaluating an expression might do something observable: a call or `new` (unless marked pure), an assignment, an update or an await. Function bodies don't run yet. */
function mayHaveSideEffects(node: unknown, source: string): boolean {
  if (Array.isArray(node)) return node.some((n) => mayHaveSideEffects(n, source));
  if (!node || typeof node !== "object") return false;
  const n = node as { type: string; start: number } & Record<string, unknown>;
  if (n.type === "ArrowFunctionExpression" || n.type === "FunctionDeclaration") return false;
  if ((n.type === "CallExpression" || n.type === "NewExpression") && !isPure(source, n.start)) return true;
  if (n.type === "AssignmentExpression" || n.type === "UpdateExpression" || n.type === "AwaitExpression") return true;
  return Object.entries(n).some(([k, v]) => k !== "start" && k !== "end" && k !== "type" && mayHaveSideEffects(v, source));
}

function analyze(s: Statement, source: string): Info {
  const declaration = s.type === "ExportNamedDeclaration" && s.declaration ? s.declaration : s;
  const refs = new Set<string>();
  const declares: string[] = [];
  let sideEffect = false;
  switch (declaration.type) {
    case "FunctionDeclaration":
      if (declaration.id) declares.push(declaration.id.name);
      references(declaration, refs);
      break;
    case "VariableDeclaration":
      for (const d of declaration.declarations) declares.push(...patternNames(d.id));
      references(declaration, refs);
      sideEffect = declaration.declarations.some((d) => mayHaveSideEffects(d.init, source));
      break;
    case "ExportDefaultDeclaration":
      references(declaration.declaration, refs);
      if (declaration.declaration.type === "FunctionDeclaration") declares.push(declaration.declaration.id?.name ?? "default");
      else sideEffect = mayHaveSideEffects(declaration.declaration, source);
      declares.push("default");
      break;
    case "ImportDeclaration":
    case "ExportAllDeclaration":
      break;
    case "ExportNamedDeclaration":
      for (const sp of declaration.specifiers) if (!declaration.source) refs.add(sp.local.name);
      break;
    default:
      references(declaration, refs);
      sideEffect = declaration.type !== "EmptyStatement";
  }
  for (const d of declares) refs.delete(d);
  return { declares, refs: [...refs], sideEffect };
}

/** The package.json a file belongs to, if it sits in node_modules. */
function packageSideEffectsFalse(files: Project, path: string): boolean {
  const match = /^(.*node_modules\/(?:@[^/]+\/)?[^/]+)\//.exec(path);
  if (!match) return false;
  try {
    const pkg = JSON.parse(files[`${match[1]}/package.json`] ?? "{}") as { sideEffects?: unknown };
    if (pkg.sideEffects === false) return true;
    if (Array.isArray(pkg.sideEffects)) return !pkg.sideEffects.some((f) => typeof f === "string" && path.endsWith(f.replace(/^\.\//, "")));
  } catch {
    return false;
  }
  return false;
}

export function treeShake(graph: Graph, files: Project): TreeShakeResult {
  const records = [...graph.modules.values()].filter((m) => m.program);
  const infos = new Map<string, Info[]>(records.map((m) => [m.path, m.program!.body.map((s) => analyze(s, m.source))]));
  const requests = new Map<string, Set<string>>([[graph.entry, new Set(["*"])]]);
  const reachable = new Set([graph.entry]);
  const keep = new Map<string, Set<number>>();
  const included = new Map<string, string>();

  const request = (path: string | null, name: string) => {
    if (!path) return false;
    const set = requests.get(path) ?? new Set();
    if (set.has(name)) return false;
    set.add(name);
    requests.set(path, set);
    return true;
  };
  const resolvedOf = (m: ModuleRecord, specifier: string, kinds: string[]) => m.imports.find((i) => i.specifier === specifier && kinds.includes(i.kind))?.resolved ?? null;

  for (let changed = true, rounds = 0; changed && rounds < 50; rounds++) {
    changed = false;
    for (const m of records) {
      if (!reachable.has(m.path)) continue;
      const body = m.program!.body;
      const info = infos.get(m.path)!;
      const wanted = requests.get(m.path) ?? new Set<string>();
      const all = wanted.has("*");
      const kept = new Set<number>();
      const locals = new Set<string>();

      // Which exports are asked for, and where each one comes from.
      body.forEach((s, i) => {
        if (s.type === "ExportNamedDeclaration") {
          const declared = s.declaration ? info[i].declares : [];
          for (const name of declared) if (all || wanted.has(name)) locals.add(name);
          for (const sp of s.specifiers) {
            if (!all && !wanted.has(sp.exported.name)) continue;
            kept.add(i);
            if (s.source) changed = request(resolvedOf(m, s.source.value, ["reexport"]), sp.local.name) || changed;
            else locals.add(sp.local.name);
          }
        } else if (s.type === "ExportDefaultDeclaration" && (all || wanted.has("default"))) kept.add(i);
        else if (s.type === "ExportAllDeclaration" && wanted.size) {
          kept.add(i);
          for (const name of wanted) changed = request(resolvedOf(m, s.source.value, ["reexport"]), name) || changed;
        }
      });

      const hasSideEffects = info.some((x) => x.sideEffect);
      const promisesNone = packageSideEffectsFalse(files, m.path);
      const isEntry = m.path === graph.entry;
      const usedNames = all ? m.exports : m.exports.filter((e) => wanted.has(e));
      let reason: string | null = null;
      if (isEntry) reason = "the entry point";
      else if (usedNames.length) reason = `used exports: ${usedNames.join(", ")}`;
      else if (hasSideEffects && !promisesNone) reason = "no export used, but its top-level code may have side effects";
      if (!reason) continue;
      if (included.get(m.path) !== reason) {
        included.set(m.path, reason);
        changed = true;
      }

      // Keep side effects and what the needed names depend on, until nothing new is needed.
      info.forEach((x, i) => {
        if (x.sideEffect || isEntry) kept.add(i);
      });
      for (let grew = true; grew; ) {
        grew = false;
        info.forEach((x, i) => {
          if (!kept.has(i) && x.declares.some((d) => locals.has(d))) {
            kept.add(i);
            grew = true;
          }
        });
        for (const i of kept) for (const r of info[i].refs) if (!locals.has(r)) {
          locals.add(r);
          grew = true;
        }
      }

      // Imports: names used by kept code are requested; every imported module is reachable (importing evaluates it).
      body.forEach((s, i) => {
        if (s.type !== "ImportDeclaration") return;
        const target = resolvedOf(m, s.source.value, ["static", "sideEffect"]);
        if (target && !reachable.has(target)) {
          reachable.add(target);
          changed = true;
        }
        for (const sp of s.specifiers) {
          if (!locals.has(sp.local.name)) continue;
          const name = sp.type === "ImportDefaultSpecifier" ? "default" : sp.type === "ImportNamespaceSpecifier" ? "*" : sp.imported.name;
          changed = request(target, name) || changed;
        }
        if (target && included.has(target)) kept.add(i);
      });
      for (const imp of m.imports) {
        if ((imp.kind === "reexport" || imp.kind === "dynamic") && imp.resolved && !reachable.has(imp.resolved)) {
          reachable.add(imp.resolved);
          changed = true;
        }
        if (imp.kind === "dynamic") changed = request(imp.resolved, "*") || changed;
      }
      const before = keep.get(m.path);
      if (!before || before.size !== kept.size) changed = true;
      keep.set(m.path, kept);
    }
  }

  const usedExports = new Map<string, Set<string>>();
  const report: ModuleReport[] = [];
  for (const m of graph.modules.values()) {
    const wanted = requests.get(m.path) ?? new Set<string>();
    const used = new Set(wanted.has("*") ? m.exports : m.exports.filter((e) => wanted.has(e)));
    usedExports.set(m.path, used);
    const infoList = infos.get(m.path) ?? [];
    const sideEffects = infoList.some((x) => x.sideEffect);
    const reason = included.get(m.path);
    let dropped = "never imported";
    if (reachable.has(m.path)) dropped = packageSideEffectsFalse(files, m.path) && sideEffects ? 'no export used, and its package.json says "sideEffects": false' : "no export used and no side effects";
    report.push({ path: m.path, included: !!reason, reason: reason ?? dropped, exports: m.exports.map((name) => ({ name, used: used.has(name) && !!reason })), sideEffects });
    if (!reason) keep.delete(m.path);
  }
  return { keep, usedExports, report };
}
