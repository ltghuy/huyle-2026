import type { Expression, Identifier, Pattern, Program, Statement } from "@/handbook/transpiling/compiler/ast";
import { generate } from "@/handbook/transpiling/compiler/codegen";

import type { Graph, ModuleRecord } from "./graph";

// Linking turns each ES module into a function the runtime can call, the way
// webpack does: `import` becomes a call to `__require`, every use of an
// imported name reads a property of the required module (so bindings stay
// live), and exports become getters on the module's `exports` object, set up
// before the module body runs. Simplification: a local variable that shadows
// an imported name is rewritten too, so the samples avoid shadowing.

export type ChunkPlan = {
  /** Chunk id → module paths in it. "main" is the entry chunk. */
  chunks: Map<string, string[]>;
  /** For a dynamically imported module, the chunks to load before requiring it. */
  load: (path: string) => string[];
};

export type LinkOptions = {
  chunks?: ChunkPlan;
  /** Tree shaking: the statement indices to keep per module, and the exports still used. */
  keep?: Map<string, Set<number>>;
  usedExports?: Map<string, Set<string>>;
};

export type BundleFile = { name: string; chunk: string; code: string };

const id = (name: string): Identifier => ({ type: "Identifier", start: -1, end: -1, name });
const str = (value: string): Expression => ({ type: "StringLiteral", start: -1, end: -1, value, raw: JSON.stringify(value) });
const member = (object: Expression, name: string): Expression => ({ type: "MemberExpression", start: -1, end: -1, object, property: id(name), computed: false, optional: false });
const call = (callee: Expression, args: Expression[]): Expression => ({ type: "CallExpression", start: -1, end: -1, callee, arguments: args, optional: false, typeArguments: null });
const arrow = (body: Expression): Expression => ({ type: "ArrowFunctionExpression", start: -1, end: -1, params: [], body, async: false, returnType: null, typeParameters: null });
const statement = (expression: Expression): Statement => ({ type: "ExpressionStatement", start: -1, end: -1, expression });
const constant = (name: string, init: Expression): Statement => ({
  type: "VariableDeclaration",
  start: -1,
  end: -1,
  kind: "const",
  declarations: [{ type: "VariableDeclarator", start: -1, end: -1, id: id(name), init }],
});
const requireCall = (path: string) => call(id("__require"), [str(path)]);

type Ctx = { bindings: Map<string, Expression>; dynamic: (specifier: string) => Expression | null };

function visitPattern(p: Pattern, ctx: Ctx): Pattern {
  switch (p.type) {
    case "AssignmentPattern":
      return { ...p, left: visitPattern(p.left, ctx), right: visit(p.right, ctx) as Expression };
    case "ObjectPattern":
      return { ...p, properties: p.properties.map((prop) => (prop.type === "RestElement" ? prop : { ...prop, value: visitPattern(prop.value, ctx) })) };
    case "ArrayPattern":
      return { ...p, elements: p.elements.map((e) => (e ? visitPattern(e, ctx) : null)) };
    default:
      return p;
  }
}

/** Rewrites uses of imported names and dynamic imports anywhere below `node`. */
function visit(node: unknown, ctx: Ctx): unknown {
  if (Array.isArray(node)) return node.map((n) => visit(n, ctx));
  if (!node || typeof node !== "object") return node;
  const n = node as { type: string } & Record<string, unknown>;
  switch (n.type) {
    case "Identifier":
      return ctx.bindings.get(n.name as string) ?? n;
    case "MemberExpression":
      return { ...n, object: visit(n.object, ctx), property: n.computed ? visit(n.property, ctx) : n.property };
    case "ObjectProperty": {
      if (n.shorthand && (n.value as { type: string }).type === "Identifier") {
        const bound = ctx.bindings.get((n.value as Identifier).name);
        if (bound) return { ...n, shorthand: false, value: bound };
      }
      return { ...n, key: n.computed ? visit(n.key, ctx) : n.key, value: visit(n.value, ctx) };
    }
    case "VariableDeclarator":
      return { ...n, id: visitPattern(n.id as Pattern, ctx), init: visit(n.init, ctx) };
    case "FunctionDeclaration":
    case "ArrowFunctionExpression":
      return { ...n, params: (n.params as Pattern[]).map((p) => visitPattern(p, ctx)), body: visit(n.body, ctx) };
    case "ImportExpression": {
      const source = n.source as { type: string; value?: string };
      const rewritten = source.type === "StringLiteral" ? ctx.dynamic(source.value!) : null;
      return rewritten ?? n;
    }
    default: {
      const out: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(n)) out[k] = k === "start" || k === "end" || k === "type" ? v : visit(v, ctx);
      return out;
    }
  }
}

function localName(path: string, used: Set<string>) {
  const base = "_" + (path.split("/").pop() ?? "m").replace(/\.\w+$/, "").replace(/\W/g, "_");
  let name = base;
  for (let i = 2; used.has(name); i++) name = base + i;
  used.add(name);
  return name;
}

/** One module's body, linked. */
export function linkModule(record: ModuleRecord, options: LinkOptions): Statement[] {
  const program = record.program as Program;
  const keep = options.keep?.get(record.path);
  const used = options.usedExports?.get(record.path);
  const resolvedOf = (specifier: string, kinds: string[]) => record.imports.find((i) => i.specifier === specifier && kinds.includes(i.kind))?.resolved ?? specifier;
  const names = new Set<string>();
  const ctx: Ctx = {
    bindings: new Map(),
    dynamic: (specifier) => {
      const path = resolvedOf(specifier, ["dynamic"]);
      const load = options.chunks?.load(path) ?? [];
      const loader: Expression =
        load.length === 0
          ? call(member(id("Promise"), "resolve"), [])
          : load.length === 1
            ? call(member(id("__require"), "chunk"), [str(load[0])])
            : call(member(id("Promise"), "all"), [{ type: "ArrayExpression", start: -1, end: -1, elements: load.map((c) => call(member(id("__require"), "chunk"), [str(c)])) }]);
      return call(member(loader, "then"), [arrow(requireCall(path))]);
    },
  };

  const statements = program.body.map((s, index) => ({ s, index })).filter(({ index }) => !keep || keep.has(index));
  const body: Statement[] = [];
  const getters: { name: string; value: Expression }[] = [];

  // Imports first: they are hoisted, and their names must be known before the rest is rewritten.
  for (const { s } of statements) {
    if (s.type !== "ImportDeclaration") continue;
    const path = resolvedOf(s.source.value, ["static", "sideEffect"]);
    if (s.specifiers.length === 0) {
      body.push(statement(requireCall(path)));
      continue;
    }
    const local = localName(path, names);
    body.push(constant(local, requireCall(path)));
    for (const sp of s.specifiers) {
      if (sp.type === "ImportNamespaceSpecifier") ctx.bindings.set(sp.local.name, id(local));
      else ctx.bindings.set(sp.local.name, member(id(local), sp.type === "ImportDefaultSpecifier" ? "default" : sp.imported.name));
    }
  }

  for (const { s } of statements) {
    switch (s.type) {
      case "ImportDeclaration":
        break;
      case "ExportNamedDeclaration":
        if (s.source) {
          const local = localName(resolvedOf(s.source.value, ["reexport"]), names);
          body.push(constant(local, requireCall(resolvedOf(s.source.value, ["reexport"]))));
          for (const sp of s.specifiers) getters.push({ name: sp.exported.name, value: member(id(local), sp.local.name) });
        } else if (s.declaration) {
          body.push(visit(s.declaration, ctx) as Statement);
          const declared = s.declaration.type === "FunctionDeclaration" ? (s.declaration.id ? [s.declaration.id.name] : []) : s.declaration.type === "VariableDeclaration" ? s.declaration.declarations.flatMap((d) => (d.id.type === "Identifier" ? [d.id.name] : [])) : [];
          for (const name of declared) getters.push({ name, value: id(name) });
        } else {
          for (const sp of s.specifiers) getters.push({ name: sp.exported.name, value: visit(id(sp.local.name), ctx) as Expression });
        }
        break;
      case "ExportDefaultDeclaration":
        if (s.declaration.type === "FunctionDeclaration") {
          const fn = s.declaration.id ? s.declaration : { ...s.declaration, id: id("__default") };
          body.push(visit(fn, ctx) as Statement);
          getters.push({ name: "default", value: id(fn.id!.name) });
        } else {
          body.push(constant("__default", visit(s.declaration, ctx) as Expression));
          getters.push({ name: "default", value: id("__default") });
        }
        break;
      case "ExportAllDeclaration":
        body.push(statement(call(member(id("__require"), "exportStar"), [id("exports"), requireCall(resolvedOf(s.source.value, ["reexport"]))])));
        break;
      default:
        body.push(visit(s, ctx) as Statement);
    }
  }

  const exported = getters.filter((g) => !used || used.has(g.name));
  if (exported.length) {
    const object: Expression = {
      type: "ObjectExpression",
      start: -1,
      end: -1,
      properties: exported.map((g) => ({ type: "ObjectProperty", start: -1, end: -1, key: /^[A-Za-z_$][\w$]*$/.test(g.name) ? id(g.name) : str(g.name), value: arrow(g.value), shorthand: false, computed: false })),
    };
    body.unshift(statement(call(member(id("__require"), "export"), [id("exports"), object])));
  }
  return body;
}

function indent(code: string, spaces: number) {
  const pad = " ".repeat(spaces);
  return code
    .trimEnd()
    .split("\n")
    .map((line) => (line ? pad + line : line))
    .join("\n");
}

function moduleEntry(record: ModuleRecord, options: LinkOptions) {
  const program: Program = { type: "Program", start: 0, end: 0, body: linkModule(record, options) };
  const code = generate(program).code;
  return `${JSON.stringify(record.path)}: (module, exports, __require) => {\n${indent(code, 4)}\n  },`;
}

export const RUNTIME = `  const cache = {};
  function __require(id) {
    if (cache[id]) {
      __host.trace("cache", id); // (added for this demo)
      return cache[id].exports;
    }
    if (!modules[id]) throw new Error("Cannot find module '" + id + "'");
    const module = (cache[id] = { exports: {} });
    __host.trace("evaluate", id); // (added for this demo)
    modules[id](module, module.exports, __require);
    return module.exports;
  }
  // Exports are getters, so importers always read the current value.
  __require.export = (exports, getters) => {
    for (const name in getters) Object.defineProperty(exports, name, { enumerable: true, get: getters[name] });
  };
  __require.exportStar = (exports, from) => {
    for (const name in from) if (name !== "default" && !(name in exports)) Object.defineProperty(exports, name, { enumerable: true, get: () => from[name] });
  };
  // Lazy chunks: download once, then add their modules to the registry.
  const loaded = { main: Promise.resolve() };
  __require.chunk = (id) => (loaded[id] ??= __host.loadChunk(id).then((register) => register(modules)));`;

/** The bundle: the entry file (runtime + entry chunk) and one file per lazy chunk. */
export function bundle(graph: Graph, options: LinkOptions = {}): BundleFile[] {
  const chunks = options.chunks?.chunks ?? new Map([["main", [...graph.modules.keys()]]]);
  const included = (path: string) => graph.modules.get(path)?.program && (!options.keep || options.keep.has(path));
  const files: BundleFile[] = [];
  for (const [chunk, paths] of chunks) {
    const entries = paths.filter(included).map((p) => "  " + moduleEntry(graph.modules.get(p)!, options));
    if (chunk === "main") {
      files.unshift({
        name: "main.js",
        chunk,
        code: `(() => {\n  const modules = {\n${entries.join("\n")}\n  };\n${RUNTIME}\n  return __require(${JSON.stringify(graph.entry)});\n})();\n`,
      });
    } else {
      files.push({ name: `${chunk}.chunk.js`, chunk, code: `// Loaded on demand: adds these modules to the registry.\n__register({\n${entries.join("\n")}\n});\n` });
    }
  }
  return files;
}
