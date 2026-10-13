import type { Plugin } from "postcss";

import { contentHash } from "@/handbook/build-pipeline/sizes";

// CSS Modules: every class in a .module.css file is renamed to something
// unique to that file, and the file's JavaScript module exports the mapping
// from the name you wrote to the name in the CSS. `:global(.x)` keeps a name
// as written; `composes: a` adds another local class to this one's export.

export type ModuleResult = { css: string; exports: Record<string, string> };

const CLASS = /\.(-?[_a-zA-Z][\w-]*)/g;

/** Local class names in a stylesheet, skipping those inside :global(...). */
export function localClasses(css: string): string[] {
  const withoutGlobals = css.replace(/:global\([^)]*\)/g, "");
  const names = new Set<string>();
  for (const rule of withoutGlobals.split("{").map((part) => part.split("}").pop() ?? "")) for (const m of rule.matchAll(CLASS)) names.add(m[1]);
  return [...names];
}

export async function scopedNames(file: string, css: string): Promise<Record<string, string>> {
  const base = file.split("/").pop()!.replace(/\.module\.css$/, "");
  const entries = await Promise.all(localClasses(css).map(async (name) => [name, `${base}_${name}__${(await contentHash(`${file}:${name}`)).slice(0, 5)}`] as const));
  return Object.fromEntries(entries);
}

export function cssModules(names: Record<string, string>, exportsOut: Record<string, string>): Plugin {
  return {
    postcssPlugin: "css-modules",
    Once(root) {
      for (const [local, scoped] of Object.entries(names)) exportsOut[local] = scoped;
      root.walkRules((rule) => {
        // Rename local classes; unwrap :global(...) and leave its contents alone.
        const parts = rule.selector.split(/(:global\([^)]*\))/);
        rule.selector = parts.map((part) => (part.startsWith(":global(") ? part.slice(8, -1) : part.replace(CLASS, (m, name: string) => (names[name] ? `.${names[name]}` : m)))).join("");
        rule.walkDecls("composes", (decl) => {
          const own = /\.([\w-]+)/.exec(rule.selector);
          const local = Object.entries(names).find(([, scoped]) => scoped === own?.[1])?.[0];
          if (local) exportsOut[local] = [exportsOut[local], ...decl.value.split(/\s+/).map((n) => names[n] ?? n)].join(" ");
          decl.remove();
        });
      });
    },
  };
}
