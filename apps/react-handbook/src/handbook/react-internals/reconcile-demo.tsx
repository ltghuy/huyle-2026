"use client";

import { RotateCcw, Wand2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";

import { Button } from "@/components/ui/button";
import { Choice } from "@/handbook/jwt/token-view";

import { useOwnedRoot } from "./isolated-root";

// Each scenario renders a "before" tree in its own React root. Applying the
// change renders the "after" tree synchronously while a MutationObserver
// records every DOM operation React performs.

type ScenarioId = "props" | "type" | "index-keys" | "stable-keys";

const SCENARIOS = [
  { value: "props", label: "Change props, same type" },
  { value: "type", label: "Change the element type" },
  { value: "index-keys", label: "Insert at the top: index keys" },
  { value: "stable-keys", label: "Insert at the top: stable keys" },
] as const satisfies readonly { value: ScenarioId; label: string }[];

const EXPLAIN: Record<ScenarioId, string> = {
  props: "Same type in the same place: React keeps the DOM node and the component, and only updates what changed.",
  type: "A different type in the same place: React throws the old subtree away, DOM and state included, and mounts a new one.",
  "index-keys": "Keys are positions, so React matches the old first row to the new first row: it rewrites every row's text, and each row keeps the state of whatever used to be there.",
  "stable-keys": "Keys are the items' names, so React sees one new item, inserts one node, and every row keeps its own state.",
};

/** A row with its own state, initialized from its name: shows whose state each row really has. */
function Note({ name }: { name: string }) {
  const [note, setNote] = useState(`note for ${name}`);
  return (
    <span className="flex items-center gap-2">
      <span className="w-6 font-medium">{name}</span>
      <input aria-label={`Note in the row showing ${name}`} value={note} onChange={(e) => setNote(e.target.value)} className="h-7 min-w-0 flex-1 rounded border bg-background px-2 text-xs" />
    </span>
  );
}

function Scenario({ id, after }: { id: ScenarioId; after: boolean }) {
  if (id === "props") {
    return (
      <div className="flex flex-col gap-2">
        <p className={after ? "rounded bg-primary/15 px-2 font-medium" : "px-2"} title={after ? "version 2" : "version 1"}>
          Order status: {after ? "shipped" : "packing"}
        </p>
        <Note name="A" />
      </div>
    );
  }
  if (id === "type") {
    const content = <Note name="A" />;
    return after ? <section className="rounded border p-2">{content}</section> : <div className="rounded border p-2">{content}</div>;
  }
  const items = after ? ["A", "B", "C"] : ["B", "C"];
  return (
    <ul className="flex flex-col gap-1.5">
      {items.map((name, index) => (
        <li key={id === "index-keys" ? index : name}>
          <Note name={name} />
        </li>
      ))}
    </ul>
  );
}

function describeNode(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) return `text ${JSON.stringify(node.textContent)}`;
  const el = node as Element;
  const text = el.textContent?.trim();
  return `<${el.tagName.toLowerCase()}>${text ? ` (${JSON.stringify(text.slice(0, 30))})` : ""}`;
}

type Summary = { ops: string[]; hidden: number };

/** The DOM operations, with repeated writes to one attribute or text node collapsed to their net change (and no-op ones counted, not listed). */
function summarize(records: MutationRecord[]): Summary {
  const ops: string[] = [];
  const firstOld = new Map<string, { record: MutationRecord; old: string | null; at: number }>();
  const keyOf = (r: MutationRecord) => `${r.type}:${r.attributeName ?? ""}`;
  const targets = new Map<Node, Map<string, { old: string | null; at: number }>>();
  let hidden = 0;
  for (const r of records) {
    if (r.type === "childList") {
      for (const n of r.removedNodes) ops.push(`removed ${describeNode(n)}`);
      for (const n of r.addedNodes) ops.push(`inserted ${describeNode(n)}${r.previousSibling ? "" : " at the start"}`);
      continue;
    }
    const perTarget = targets.get(r.target) ?? new Map();
    targets.set(r.target, perTarget);
    if (!perTarget.has(keyOf(r))) {
      perTarget.set(keyOf(r), { old: r.oldValue, at: ops.length });
      ops.push("");
      firstOld.set(`${ops.length - 1}`, { record: r, old: r.oldValue, at: ops.length - 1 });
    } else hidden++;
  }
  for (const { record: r, old, at } of firstOld.values()) {
    const now = r.type === "characterData" ? r.target.textContent : (r.target as Element).getAttribute(r.attributeName!);
    if (now === old) {
      hidden++;
      ops[at] = "";
    } else ops[at] = r.type === "characterData" ? `text ${JSON.stringify(old)} → ${JSON.stringify(now)}` : `attribute ${r.attributeName}: ${JSON.stringify(old)} → ${JSON.stringify(now)}`;
  }
  return { ops: ops.filter(Boolean), hidden };
}

export function ReconcileDemo() {
  const [scenario, setScenario] = useState<ScenarioId>("index-keys");
  const [applied, setApplied] = useState(false);
  const [mutations, setMutations] = useState<Summary | null>(null);
  const { container, root } = useOwnedRoot();
  const mount = useRef(0);

  // A fresh mount (new key) for every scenario or reset, so state starts clean.
  useEffect(() => {
    mount.current++;
    root.current?.render(<Scenario key={mount.current} id={scenario} after={false} />);
  }, [scenario, root]);

  function handleApply() {
    const el = container.current;
    if (!el || !root.current) return;
    const observer = new MutationObserver(() => {});
    observer.observe(el, { subtree: true, childList: true, characterData: true, characterDataOldValue: true, attributes: true, attributeOldValue: true });
    flushSync(() => root.current!.render(<Scenario key={mount.current} id={scenario} after />));
    const records = observer.takeRecords();
    observer.disconnect();
    setMutations(summarize(records));
    setApplied(true);
  }

  function handleReset() {
    mount.current++;
    root.current?.render(<Scenario key={mount.current} id={scenario} after={false} />);
    setMutations(null);
    setApplied(false);
  }

  function handleScenarioChange(value: ScenarioId) {
    setScenario(value);
    setMutations(null);
    setApplied(false);
  }

  return (
    <div className="flex flex-col gap-4">
      <Choice legend="Change" value={scenario} options={SCENARIOS} onChange={handleScenarioChange} />
      <div className="grid min-w-0 gap-4 lg:grid-cols-2">
        <div className="flex min-w-0 flex-col gap-2">
          <p className="text-xs text-muted-foreground">
            The rendered tree ({applied ? "after" : "before"}). Each row&apos;s note is its own state; edit one before applying the change to follow it.
          </p>
          <div ref={container} className="rounded-lg border border-dashed p-3 text-sm" />
          <div className="flex flex-wrap gap-2">
            <Button onClick={handleApply} disabled={applied}>
              <Wand2 aria-hidden />
              Apply the change
            </Button>
            <Button variant="ghost" onClick={handleReset}>
              <RotateCcw aria-hidden />
              Reset
            </Button>
          </div>
        </div>
        <div className="flex min-w-0 flex-col gap-2">
          <p className="text-sm font-medium">DOM operations React performed</p>
          <div aria-live="polite">
            {mutations ? (
              <>
                <ol className="flex flex-col gap-0.5 rounded-lg border p-2 font-mono text-xs">
                  {mutations.ops.length ? mutations.ops.map((m, i) => <li key={i} className="break-all">{m}</li>) : <li>none</li>}
                </ol>
                <p className="mt-2 text-sm">
                  {mutations.ops.length} {mutations.ops.length === 1 ? "change" : "changes"}. {EXPLAIN[scenario]}
                </p>
                {mutations.hidden ? (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Not listed: {mutations.hidden} {mutations.hidden === 1 ? "write" : "writes"} that left a value as it was (React rewrites the name attribute of
                    inputs it updates).
                  </p>
                ) : null}
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Apply the change to record the DOM mutations.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
