import type { AtRule, ChildNode, Container, Declaration, Document, Plugin, Root, Rule } from "postcss";

import type { AnyNode } from "@/handbook/transpiling/compiler/ast";

// Three small PostCSS plugins written for this page, using PostCSS's real
// plugin API, plus an adapter that turns PostCSS's tree into the generic tree
// view used on the Transpiling page.

export type Postcss = typeof import("postcss").default;

let loading: Promise<Postcss> | null = null;

/** PostCSS is loaded only when the demo needs it. */
export function loadPostcss(): Promise<Postcss> {
  loading ??= import("postcss").then((m) => m.default);
  return loading;
}

function resolveNested(parents: string[], children: string[]): string[] {
  return parents.flatMap((p) => children.map((c) => (c.includes("&") ? c.replaceAll("&", p) : `${p} ${c}`)));
}

/** Moves nested rules and nested @media out of their parents, as postcss-nesting does (simplified: no :is() wrapping). */
export function flattenNesting(): Plugin {
  return {
    postcssPlugin: "flatten-nesting",
    Once(root, { rule }) {
      const unwrap = (parent: Rule) => {
        let after: ChildNode = parent;
        for (const child of [...(parent.nodes ?? [])]) {
          if (child.type === "rule") {
            child.selectors = resolveNested(parent.selectors, child.selectors);
            child.remove();
            after.after(child);
            after = child;
            unwrap(child);
          } else if (child.type === "atrule" && child.name === "media") {
            const inner = rule({ selectors: parent.selectors, source: child.source });
            for (const n of [...(child.nodes ?? [])]) {
              n.remove();
              inner.append(n);
            }
            child.removeAll();
            child.append(inner);
            child.remove();
            after.after(child);
            after = child;
            unwrap(inner);
          }
        }
        if (!parent.nodes?.length) parent.remove();
      };
      root.each((node) => {
        if (node.type === "rule") unwrap(node);
      });
      // Moved rules keep their old whitespace; reset it so the output is printed tidily.
      root.walk((node) => {
        node.cleanRaws();
        if (node.type === "rule" || node.type === "atrule") node.raws.semicolon = true;
        if (node !== root.first) node.raws.before = node.parent === root ? "\n\n" : "\n  ";
      });
      root.walkDecls((decl) => {
        if (decl.parent?.parent?.type === "atrule") decl.raws.before = "\n    ";
      });
      root.walkRules((r) => {
        if (r.parent?.type === "atrule") {
          r.raws.before = "\n  ";
          r.raws.after = "\n  ";
        } else r.raws.after = "\n";
      });
      root.walkAtRules((a) => {
        a.raws.after = "\n";
      });
    },
  };
}

/** Simplified data, roughly what Autoprefixer adds for current default browser targets. */
export const PREFIXES: Record<string, string[]> = {
  "user-select": ["-webkit-"],
  "backdrop-filter": ["-webkit-"],
  appearance: ["-webkit-"],
  "text-size-adjust": ["-webkit-", "-moz-"],
  "mask-image": ["-webkit-"],
  hyphens: ["-webkit-"],
};

export function addPrefixes(): Plugin {
  return {
    postcssPlugin: "add-prefixes",
    Declaration(decl: Declaration) {
      const prefixes = PREFIXES[decl.prop];
      if (!prefixes) return;
      for (const prefix of prefixes) {
        const prop = prefix + decl.prop;
        if (decl.parent?.some((n) => n.type === "decl" && n.prop === prop)) continue;
        decl.cloneBefore({ prop });
      }
    },
  };
}

const shortHex = (hex: string) => (/^#([0-9a-f])\1([0-9a-f])\2([0-9a-f])\3$/i.test(hex) ? `#${hex[1]}${hex[3]}${hex[5]}` : hex);

/** Drops comments and whitespace, shortens colors and zero lengths. */
export function minify(): Plugin {
  return {
    postcssPlugin: "minify",
    OnceExit(root) {
      root.walkComments((c) => {
        c.remove();
      });
      root.walk((node) => {
        node.raws.before = "";
        if (node.type === "decl") {
          node.raws.between = ":";
          node.value = node.value
            .replace(/\s+/g, " ")
            .replace(/\s*,\s*/g, ",")
            .replace(/#[0-9a-f]{6}\b/gi, shortHex)
            .replace(/(^|[\s(,])0(px|rem|em|%)/g, "$10");
        } else if (node.type === "rule") {
          node.selector = node.selector.replace(/\s*,\s*/g, ",").replace(/\s+/g, " ");
          node.raws.between = "";
          node.raws.after = "";
          node.raws.semicolon = false;
        } else if (node.type === "atrule") {
          node.raws.afterName = " ";
          node.raws.between = "";
          node.raws.after = "";
          node.raws.semicolon = false;
          node.params = node.params.replace(/\s*:\s*/g, ":");
        }
      });
      root.raws.after = "";
    },
  };
}

export const PLUGINS = [
  { id: "nesting", label: "Flatten nesting", detail: "Moves nested rules out, for browsers without CSS nesting.", make: flattenNesting },
  { id: "prefixes", label: "Add vendor prefixes", detail: "Adds -webkit- copies of properties that still need them (simplified table).", make: addPrefixes },
  { id: "minify", label: "Minify", detail: "Drops comments and whitespace, shortens colors and zero lengths.", make: minify },
] as const;

export type PluginId = (typeof PLUGINS)[number]["id"];

type TreeNode = AnyNode & { name: string; nodes?: TreeNode[] };

function label(node: ChildNode | Root | Document): string {
  switch (node.type) {
    case "rule":
      return node.selector;
    case "atrule":
      return `@${(node as AtRule).name} ${(node as AtRule).params}`.trim();
    case "decl":
      return `${node.prop}: ${node.value}${node.important ? " !important" : ""}`;
    case "comment":
      return node.text;
    default:
      return "";
  }
}

const TYPE_NAME: Record<string, string> = { root: "Root", rule: "Rule", atrule: "AtRule", decl: "Declaration", comment: "Comment" };

/** PostCSS's tree as generic nodes with source offsets, for the tree view. */
export function toTree(node: ChildNode | Root): TreeNode {
  const start = node.source?.start?.offset ?? 0;
  const end = node.source?.end?.offset ?? start;
  const children = "nodes" in node && node.nodes ? ((node as Container).nodes ?? []).map((n) => toTree(n)) : undefined;
  return { type: TYPE_NAME[node.type] ?? node.type, start, end, name: label(node), nodes: children };
}
