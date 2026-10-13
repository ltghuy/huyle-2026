"use client";

import type { AnyNode } from "./compiler/ast";
import { cn } from "@/lib/utils";

// A generic view of any node: its type, a one-line summary, and its child
// nodes grouped by the field that holds them (params, body, children…).

const SKIP = new Set(["type", "start", "end"]);

function isNode(value: unknown): value is AnyNode {
  return typeof value === "object" && value !== null && "type" in value && typeof (value as AnyNode).type === "string";
}

function summary(node: AnyNode): string {
  const n = node as AnyNode & Record<string, unknown>;
  for (const key of ["name", "operator", "raw", "keyword", "typeName", "kind", "key"]) {
    const value = n[key];
    if (typeof value === "string") return key === "raw" && value.length > 24 ? value.slice(0, 24) + "…" : value;
  }
  if (typeof n.value === "boolean") return String(n.value);
  if (n.type === "JSXElement" && isNode(n.name)) return summary(n.name);
  return "";
}

function childFields(node: AnyNode): { field: string; nodes: AnyNode[] }[] {
  const out: { field: string; nodes: AnyNode[] }[] = [];
  for (const [field, value] of Object.entries(node)) {
    if (SKIP.has(field)) continue;
    if (isNode(value)) out.push({ field, nodes: [value] });
    else if (Array.isArray(value)) {
      const nodes = value.filter(isNode);
      if (nodes.length) out.push({ field, nodes });
    }
  }
  return out;
}

/** Nodes that exist only for the type checker: TS* nodes, and type-only imports, exports and specifiers. */
function isTypeNode(node: AnyNode) {
  const n = node as AnyNode & { importKind?: string; exportKind?: string };
  return node.type.startsWith("TS") || n.importKind === "type" || n.exportKind === "type";
}

function TreeNode({ node, selected, onSelect, field }: { node: AnyNode; selected: AnyNode | null; onSelect: (node: AnyNode) => void; field?: string }) {
  const fields = childFields(node);
  const text = summary(node);
  const typeNode = isTypeNode(node);
  return (
    <li className="flex flex-col">
      <button
        type="button"
        onClick={() => onSelect(node)}
        aria-pressed={selected === node}
        className={cn(
          "flex min-h-6 w-fit max-w-full items-baseline gap-1.5 rounded-sm px-1 text-left outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50",
          selected === node && "bg-primary/15 ring-1 ring-primary",
        )}
      >
        {field ? <span className="text-foreground/70">{field}:</span> : null}
        <span className={cn("font-medium", typeNode && "text-primary underline decoration-dotted underline-offset-2")}>{node.type}</span>
        {typeNode ? <span className="rounded-sm border px-1 text-[0.625rem] text-foreground/70">type</span> : null}
        {text ? <span className="truncate text-foreground/75">{text}</span> : null}
      </button>
      {fields.length ? (
        <ul className="ml-3 border-l pl-2">
          {fields.flatMap(({ field: f, nodes }) => nodes.map((child, i) => <TreeNode key={`${f}-${i}-${child.start}`} node={child} selected={selected} onSelect={onSelect} field={nodes.length > 1 ? `${f}[${i}]` : f} />))}
        </ul>
      ) : null}
    </li>
  );
}

/** The whole tree; pick a node to see where it came from. */
export function AstTree({ root, selected, onSelect, label }: { root: AnyNode; selected: AnyNode | null; onSelect: (node: AnyNode) => void; label: string }) {
  return (
    <div role="region" aria-label={label} tabIndex={-1} className="max-h-96 overflow-auto rounded-lg border p-2 font-mono text-xs">
      <ul>
        <TreeNode node={root} selected={selected} onSelect={onSelect} />
      </ul>
    </div>
  );
}
