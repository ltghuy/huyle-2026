import { Fragment, jsx, jsxs } from "react/jsx-runtime";

import { compile } from "@/handbook/transpiling/compiler";

// Runs the reader's JSX: compiled by the Transpiling page's compiler, then
// executed with React's real JSX runtime, so the objects shown are exactly
// what React receives.

export type RunResult =
  | { ok: true; code: string; value: unknown; calls: Record<string, number>; components: string[] }
  | { ok: false; stage: "compile" | "run"; message: string; code?: string };

const COMPONENT = /function ([A-Z]\w*)\(([^)]*)\) \{/g;

export function runJsx(source: string): RunResult {
  const compiled = compile(source, { jsx: "automatic", fileName: "element.tsx" });
  if (!compiled.ok) return { ok: false, stage: "compile", message: `Line ${compiled.error.line + 1}: ${compiled.error.message}` };
  const code = compiled.code;
  const lines = code.split("\n");
  if (lines.some((l) => l.startsWith("import ") && !l.includes("react/jsx-runtime"))) return { ok: false, stage: "compile", message: "Only JSX is available here: other imports can't be loaded", code };
  const components = [...code.matchAll(COMPONENT)].map((m) => m[1]);
  // Count how often each function component is called.
  const body = lines
    .filter((l) => !l.startsWith("import "))
    .join("\n")
    .replace(/^export (default )?/gm, "")
    .replace(COMPONENT, (m, name: string) => `${m}\n  __calls[${JSON.stringify(name)}] = (__calls[${JSON.stringify(name)}] ?? 0) + 1;`);
  const calls: Record<string, number> = Object.fromEntries(components.map((c) => [c, 0]));
  try {
    const run = new Function("_jsx", "_jsxs", "_Fragment", "__calls", `${body}\nreturn typeof element === "undefined" ? undefined : element;`);
    const value = run(jsx, jsxs, Fragment, calls);
    return { ok: true, code, value, calls, components };
  } catch (error) {
    return { ok: false, stage: "run", message: error instanceof Error ? `${error.name}: ${error.message}` : String(error), code };
  }
}

/** Prints a value as React sees it: own fields that don't start with "_", functions by name, symbols by description. */
export function printValue(value: unknown, depth = 0, seen = new WeakSet<object>()): string {
  const pad = "  ".repeat(depth + 1);
  const end = "  ".repeat(depth);
  if (value === null) return "null";
  if (value === undefined) return "undefined";
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "number" || typeof value === "boolean" || typeof value === "bigint") return String(value);
  if (typeof value === "symbol") return `Symbol(${value.description ?? ""})`;
  if (typeof value === "function") return `[Function ${value.name || "anonymous"}]`;
  if (typeof value !== "object") return String(value);
  if (seen.has(value)) return "[Circular]";
  if (depth > 8) return "…";
  seen.add(value);
  if (Array.isArray(value)) {
    if (value.length === 0) return "[]";
    return `[\n${value.map((v) => pad + printValue(v, depth + 1, seen)).join(",\n")}\n${end}]`;
  }
  const keys = Object.keys(value).filter((k) => !k.startsWith("_"));
  const symbolTag = (value as Record<string, unknown>).$$typeof;
  if (keys.length === 0 && symbolTag === undefined) return "{}";
  const entries = keys.map((k) => `${pad}${/^[A-Za-z_$][\w$]*$/.test(k) ? k : JSON.stringify(k)}: ${printValue((value as Record<string, unknown>)[k], depth + 1, seen)}`);
  return `{\n${entries.join(",\n")}\n${end}}`;
}
