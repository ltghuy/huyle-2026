import type { Program, Statement } from "@/handbook/transpiling/compiler/ast";
import { compile } from "@/handbook/transpiling/compiler";

import type { Project } from "../projects";
import { type Conditions, resolve } from "./resolve";

// The module graph: start at the entry, compile each file (types stripped,
// JSX compiled), read its imports and exports from the tree, resolve each
// import to a file, and repeat for every file found.

export type ImportKindInGraph = "static" | "dynamic" | "sideEffect" | "reexport";

export type ImportRecord = {
  specifier: string;
  kind: ImportKindInGraph;
  /** Imported names: "default", "*" for a namespace or `export *`, or the exported name. */
  names: string[];
  resolved: string | null;
  error: string | null;
};

export type ModuleRecord = {
  path: string;
  source: string;
  program: Program | null;
  imports: ImportRecord[];
  exports: string[];
  error: { message: string; line: number; column: number } | null;
};

export type Graph = {
  entry: string;
  modules: Map<string, ModuleRecord>;
  /** Static-import post-order: the order modules finish evaluating in. */
  order: string[];
  importers: Map<string, string[]>;
  cycles: string[][];
};

export const DEFAULT_CONDITIONS: Conditions = { environment: "browser", kind: "import" };

function collectDynamicImports(node: unknown, out: string[]) {
  if (!node || typeof node !== "object") return;
  if (Array.isArray(node)) {
    for (const n of node) collectDynamicImports(n, out);
    return;
  }
  const n = node as { type?: string; source?: { type: string; value?: string } };
  if (n.type === "ImportExpression" && n.source?.type === "StringLiteral" && n.source.value !== undefined) out.push(n.source.value);
  for (const [key, value] of Object.entries(n)) if (key !== "start" && key !== "end") collectDynamicImports(value, out);
}

function declaredNames(s: Statement): string[] {
  if (s.type === "FunctionDeclaration") return s.id ? [s.id.name] : [];
  if (s.type === "VariableDeclaration") return s.declarations.flatMap((d) => patternNames(d.id));
  return [];
}

export function patternNames(p: unknown): string[] {
  const n = p as { type: string; name?: string; properties?: unknown[]; elements?: unknown[]; left?: unknown; argument?: unknown; value?: unknown };
  switch (n.type) {
    case "Identifier":
      return [n.name!];
    case "ObjectPattern":
      return (n.properties ?? []).flatMap((prop) => {
        const pr = prop as { type: string; value?: unknown; argument?: unknown };
        return patternNames(pr.type === "RestElement" ? pr.argument : pr.value);
      });
    case "ArrayPattern":
      return (n.elements ?? []).flatMap((e) => (e ? patternNames(e) : []));
    case "AssignmentPattern":
      return patternNames(n.left);
    case "RestElement":
      return patternNames(n.argument);
    default:
      return [];
  }
}

/** Imports and exports of one compiled module. */
function analyze(program: Program): { imports: Omit<ImportRecord, "resolved" | "error">[]; exports: string[] } {
  const imports: Omit<ImportRecord, "resolved" | "error">[] = [];
  const exports: string[] = [];
  for (const s of program.body) {
    if (s.type === "ImportDeclaration") {
      const names = s.specifiers.map((sp) => (sp.type === "ImportDefaultSpecifier" ? "default" : sp.type === "ImportNamespaceSpecifier" ? "*" : sp.imported.name));
      imports.push({ specifier: s.source.value, kind: names.length ? "static" : "sideEffect", names });
    } else if (s.type === "ExportNamedDeclaration") {
      if (s.declaration) exports.push(...declaredNames(s.declaration));
      for (const sp of s.specifiers) exports.push(sp.exported.name);
      if (s.source) imports.push({ specifier: s.source.value, kind: "reexport", names: s.specifiers.map((sp) => sp.local.name) });
    } else if (s.type === "ExportDefaultDeclaration") {
      exports.push("default");
    } else if (s.type === "ExportAllDeclaration") {
      imports.push({ specifier: s.source.value, kind: "reexport", names: ["*"] });
    }
  }
  const dynamic: string[] = [];
  collectDynamicImports(program.body, dynamic);
  for (const specifier of dynamic) imports.push({ specifier, kind: "dynamic", names: ["*"] });
  return { imports, exports };
}

export function buildGraph(files: Project, entry: string, conditions: Conditions = DEFAULT_CONDITIONS): Graph {
  const modules = new Map<string, ModuleRecord>();
  const queue = [entry];
  while (queue.length) {
    const path = queue.shift()!;
    if (modules.has(path)) continue;
    const source = files[path] ?? "";
    const result = compile(source, { jsx: "automatic", fileName: path.split("/").pop() });
    if (!result.ok) {
      modules.set(path, { path, source, program: null, imports: [], exports: [], error: { message: result.error.message, line: result.error.line, column: result.error.column } });
      continue;
    }
    const info = analyze(result.output);
    const imports = info.imports.map((imp) => {
      const r = resolve(files, path, imp.specifier, conditions);
      if (r.ok && !modules.has(r.path)) queue.push(r.path);
      return { ...imp, resolved: r.ok ? r.path : null, error: r.ok ? null : r.error };
    });
    modules.set(path, { path, source, program: result.output, imports, exports: info.exports, error: null });
  }

  const importers = new Map<string, string[]>();
  for (const m of modules.values()) {
    for (const imp of m.imports) {
      if (!imp.resolved) continue;
      const list = importers.get(imp.resolved) ?? [];
      if (!list.includes(m.path)) list.push(m.path);
      importers.set(imp.resolved, list);
    }
  }

  // Depth-first over static imports in source order, like ES module evaluation.
  const order: string[] = [];
  const cycles: string[][] = [];
  const state = new Map<string, "visiting" | "done">();
  const stack: string[] = [];
  const visit = (path: string) => {
    const st = state.get(path);
    if (st === "done") return;
    if (st === "visiting") {
      cycles.push([...stack.slice(stack.indexOf(path)), path]);
      return;
    }
    state.set(path, "visiting");
    stack.push(path);
    for (const imp of modules.get(path)?.imports ?? []) if (imp.kind !== "dynamic" && imp.resolved) visit(imp.resolved);
    stack.pop();
    state.set(path, "done");
    order.push(path);
  };
  visit(entry);
  return { entry, modules, order, importers, cycles };
}
