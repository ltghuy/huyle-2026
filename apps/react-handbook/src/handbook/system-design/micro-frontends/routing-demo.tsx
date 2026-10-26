"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Choice } from "@/handbook/jwt/token-view";
import { Verdict } from "@/handbook/ui";

import { CHANGES, EVENT_NAME, SAMPLE_PATHS, deliver, isCompatible, matchRoute, type ChangeId } from "./routing";
import { piece } from "./store";

const CHANGE_OPTIONS = CHANGES.map((c) => ({ value: c.id, label: c.label }));

/** Cart state before the event, as both listeners last saw it. */
const COUNT = 2;
const TOTAL = 120;

const CHANNELS = [
  {
    name: "The URL",
    use: "Anything that should survive a reload or a shared link: the product id, search terms, filters.",
    cost: "Only strings, and only for state that belongs in the address.",
  },
  {
    name: "Browser events",
    use: "Fire-and-forget news between pieces (an item was added, the user signed in), with a team prefix in the event name.",
    cost: "No delivery guarantee: a piece that mounts later misses earlier events, so it reads current state on mount.",
  },
  {
    name: "A shared store",
    use: "Rarely. One global store couples every team to one state shape and one library version.",
    cost: "Changing the store is a coordinated release, which is what micro frontends were meant to avoid.",
  },
];

export function RoutingDemo() {
  const [path, setPath] = useState<string>("/products/espresso-grinder");
  const [change, setChange] = useState<ChangeId>("none");

  const match = matchRoute(path);
  const selected = CHANGES.find((c) => c.id === change)!;
  const compatible = isCompatible(selected.contract);
  const deliveries = deliver(selected.payload, COUNT, TOTAL);

  return (
    <div className="flex flex-col gap-6">
      <section aria-labelledby="route-owner-heading" className="flex flex-col gap-3">
        <h4 id="route-owner-heading" className="text-sm font-semibold">
          Who owns this URL?
        </h4>
        <div className="flex min-w-0 flex-col gap-1.5">
          <Label htmlFor="route-path">Path</Label>
          <Input id="route-path" value={path} onChange={(e) => setPath(e.target.value)} className="font-mono text-sm" spellCheck={false} autoComplete="off" />
        </div>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Example paths">
          {SAMPLE_PATHS.map((p) => (
            <Button key={p} variant="outline" size="sm" className="font-mono text-xs" onClick={() => setPath(p)}>
              {p}
            </Button>
          ))}
        </div>
        <div className="rounded-lg border p-3 text-sm" aria-live="polite">
          {match.found ? (
            <p>
              The shell matches <code className="font-mono text-xs">{match.prefix}</code> and mounts <strong>{piece(match.owner).name}</strong> (
              {piece(match.owner).team} team), whose own router handles <code className="font-mono text-xs">{match.subpath}</code>. The header and layout stay the
              shell&apos;s.
            </p>
          ) : (
            <p>
              No piece owns <code className="font-mono text-xs">{match.path}</code>, so the shell renders its own not-found page. A new section needs a new
              prefix in the shell&apos;s route table, which is the one change every team&apos;s routes go through.
            </p>
          )}
        </div>
      </section>

      <section aria-labelledby="contract-heading" className="flex flex-col gap-3">
        <h4 id="contract-heading" className="text-sm font-semibold">
          Catalog adds an item to the cart
        </h4>
        <Choice legend="Catalog's next release changes the event" value={change} options={CHANGE_OPTIONS} onChange={setChange} />
        <p className="font-mono text-xs break-all">
          dispatchEvent(new CustomEvent(&quot;{EVENT_NAME}&quot;, &#123; detail: {JSON.stringify(selected.payload)} &#125;))
        </p>
        <div className="flex flex-col gap-2 rounded-lg border p-3 text-sm" aria-live="polite">
          <p>
            <Verdict pass={compatible}>{compatible ? "Compatible change" : "Breaking change"}</Verdict>
            <span className="text-foreground/85">
              {" "}
              {compatible
                ? "Every field from version 1 is still sent with the same type, so listeners written against it keep working."
                : "A field from version 1 is gone or changed type. Listeners that still read the old shape break at runtime, with no compile error to warn anyone."}
            </span>
          </p>
          <ul className="flex flex-col gap-1.5">
            {deliveries.map((d) => (
              <li key={d.listener.id} className="grid gap-x-2 sm:grid-cols-[12rem_1fr]">
                <span className="font-medium">
                  {d.listener.name} <span className="font-normal text-foreground/75">({piece(d.listener.owner).name})</span>
                </span>
                <span>
                  <Verdict pass={d.works}>{d.shown}</Verdict>
                  <span className="text-foreground/85">: {d.reason}.</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
        <p className="text-xs text-foreground/75">
          Before the event the cart held {COUNT} items worth €{TOTAL}. Both listeners were written against version 1:{" "}
          <code className="font-mono">&#123; sku: string, quantity: number, price: number &#125;</code>. One example contract; teams often publish it as a typed
          package or a JSON Schema and run a contract test in each consumer&apos;s pipeline.
        </p>
      </section>

      <ul className="grid gap-3 md:grid-cols-3" aria-label="Ways pieces can talk to each other">
        {CHANNELS.map((c) => (
          <li key={c.name} className="flex flex-col gap-1.5 rounded-lg border p-3 text-sm">
            <h4 className="font-semibold">{c.name}</h4>
            <p className="text-xs text-foreground/85">{c.use}</p>
            <p className="text-xs text-foreground/75">Cost: {c.cost}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
