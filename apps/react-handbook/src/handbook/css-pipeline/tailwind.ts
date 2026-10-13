import { TAILWIND_THEME_CSS } from "./tailwind-theme";

// Runs the real Tailwind CSS compiler in the browser. Tailwind reads your
// files as plain text, collects every string that could be a class name (a
// "candidate"), and generates CSS only for the candidates that are utilities.

type Compile = typeof import("tailwindcss").compile;

let loading: Promise<Compile> | null = null;

export function loadTailwind(): Promise<Compile> {
  loading ??= import("tailwindcss").then((m) => m.compile);
  return loading;
}

export const TAILWIND_INPUT = `@import "tailwindcss/theme";
@tailwind utilities;`;

/** CSS for these candidates. A new compiler each time: `build` remembers candidates between calls. */
export async function buildUtilities(compile: Compile, candidates: string[]): Promise<string> {
  const compiler = await compile(TAILWIND_INPUT, { base: "/", loadStylesheet: async (id, base) => ({ path: id, base, content: TAILWIND_THEME_CSS }) });
  return compiler.build(candidates);
}

/**
 * Simplified candidate scanner: split the text on characters that can't be in
 * a class name and keep what looks like one. Tailwind's own scanner (Oxide)
 * is smarter, but follows the same rule: a class must appear whole in a file.
 */
export function scanCandidates(source: string): string[] {
  const found = new Set<string>();
  for (const token of source.split(/[\s"'`{}<>=;,$()]+/)) {
    const t = token.replace(/^[.:]+|[.:]+$/g, "");
    if (t.length > 1 && /^!?-?[a-z@[][\w\-:/[\].#%!]*$/.test(t) && !/^\d/.test(t)) found.add(t);
  }
  return [...found];
}
