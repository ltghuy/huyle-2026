"use client";

import { useState } from "react";

import { Toggle, Verdict } from "@/handbook/ui";
import { cn } from "@/lib/utils";

import { type CanonicalState, chooseCanonical, HTTPS_POINTS, type SignalId, SIGNALS, type VariantId, VARIANTS } from "./canonical";
import { FieldSelect } from "./field-select";

const INITIAL: CanonicalState = {
  variants: new Set<VariantId>(["http", "slash", "utm"]),
  targets: { redirect: "none", canonical: "preferred", links: "slash", sitemap: "preferred" },
};

const urlOf = (id: VariantId) => VARIANTS.find((v) => v.id === id)!.url;

export function CanonicalDemo() {
  const [state, setState] = useState(INITIAL);
  const result = chooseCanonical(state);
  const live = VARIANTS.filter((v) => v.id === "preferred" || state.variants.has(v.id));
  const targetOptions = [{ value: "none" as const, label: "Not set" }, ...live.map((v) => ({ value: v.id, label: v.url.replace("https://", "").replace(/^http:\/\//, "http://") }))];

  function handleVariant(id: VariantId, on: boolean) {
    setState((current) => {
      const variants = new Set(current.variants);
      if (on) variants.add(id);
      else variants.delete(id);
      // A signal can't point at a URL that no longer exists.
      const targets = Object.fromEntries(Object.entries(current.targets).map(([k, t]) => [k, t !== "none" && t !== "preferred" && !variants.has(t) ? "none" : t])) as CanonicalState["targets"];
      return { variants, targets };
    });
  }

  function handleTarget(signal: SignalId, target: VariantId | "none") {
    setState((current) => ({ ...current, targets: { ...current.targets, [signal]: target } }));
  }

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <fieldset className="flex min-w-0 flex-col gap-2">
        <legend className="mb-1.5 text-xs font-medium text-foreground/75">The same page also answers at</legend>
        <div className="grid min-w-0 gap-2 sm:grid-cols-2">
          {VARIANTS.filter((v) => v.id !== "preferred").map((v) => (
            <Toggle
              key={v.id}
              checked={state.variants.has(v.id)}
              onCheckedChange={(on) => handleVariant(v.id, on)}
              title={<code className="font-mono text-xs break-all">{v.url}</code>}
              detail={v.cause}
            />
          ))}
        </div>
      </fieldset>

      <div className="grid min-w-0 gap-3 sm:grid-cols-2">
        {SIGNALS.map((s) => (
          <FieldSelect key={s.id} label={`${s.label} (${s.strength})`} value={state.targets[s.id]} options={targetOptions} onChange={(t) => handleTarget(s.id, t)} />
        ))}
      </div>

      <div aria-live="polite" className="flex min-w-0 flex-col gap-3">
        <ul className="flex min-w-0 flex-col gap-1.5">
          {result.scores.map((s) => (
            <li key={s.id} className={cn("flex min-w-0 items-center gap-3 rounded-lg border p-2.5 text-sm", s.id === result.chosen && "border-primary/50 bg-primary/5")}>
              <span className="w-10 shrink-0 text-right font-mono tabular-nums">{s.points}</span>
              <code className="min-w-0 flex-1 font-mono text-xs break-all">{urlOf(s.id)}</code>
              {s.id === result.chosen ? <span className="shrink-0 text-xs font-medium">Likely canonical</span> : null}
            </li>
          ))}
        </ul>
        <div className="flex flex-col gap-1.5 rounded-lg bg-muted/40 p-3 text-sm">
          {result.unguided ? (
            <p>
              No signal is set, so the search engine groups the copies and picks one itself (here the HTTPS one), and Search Console reports{" "}
              <q className="font-mono text-xs">Duplicate without user-selected canonical</q> for the rest.
            </p>
          ) : (
            <p className="flex flex-wrap items-center gap-x-2">
              <Verdict pass={result.agree}>{result.agree ? "Signals agree" : "Signals conflict"}</Verdict>
              {result.agree
                ? "Every signal points at the same URL, so it is the clear choice."
                : "They point at different URLs, so the search engine has to weigh them and may not pick yours."}
            </p>
          )}
          {result.overruled ? (
            <p>
              Your canonical tag lost to stronger signals. Search Console would report{" "}
              <q className="font-mono text-xs">Duplicate, Google chose different canonical than user</q>.
            </p>
          ) : null}
          {!result.agree || result.unguided ? (
            <p>
              <span className="font-medium">Fix: </span>
              point every signal at one URL: redirect the copies to it, set <code className="font-mono text-xs">rel=&quot;canonical&quot;</code> to it,
              link to it, and list only it in the sitemap.
            </p>
          ) : null}
        </div>
      </div>

      <p className="text-xs text-foreground/75">
        Simplified model. Points per signal: {SIGNALS.map((s) => `${s.short} ${s.points}`).join(", ")}, and{" "}
        {HTTPS_POINTS} for an HTTPS URL. The highest total wins. Google publishes which signals are strong and which are weak, not numbers, and it also
        compares the content itself.
      </p>
    </div>
  );
}
