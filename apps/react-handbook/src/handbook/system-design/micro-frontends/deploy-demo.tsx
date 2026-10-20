"use client";

import { Loader2 } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Toggle, Verdict } from "@/handbook/ui";
import { cn } from "@/lib/utils";

import { INITIAL_STATE, TIMEOUT_MS, current, outcome, release, rollback, setSlow, type BuildKind, type SlotView } from "./deploy";
import { PIECES, type PieceId, type Slot } from "./store";

const KIND_NOTE: Record<BuildKind, string> = { good: "", crash: "throws on render", contract: "changed a contract" };

const SLOT_TONE: Record<SlotView["shows"], string> = {
  content: "border-border bg-card",
  fallback: "border-dashed border-foreground/40 bg-muted/40",
  loading: "border-dashed border-info bg-info/10",
  wrong: "border-destructive bg-destructive/10",
};

const SLOT_STATE: Record<SlotView["shows"], string> = { content: "", fallback: "Fallback", loading: "Loading", wrong: "Wrong data" };

const AREA: Record<Slot, string> = {
  header: "sm:col-span-3",
  main: "sm:col-span-2 sm:row-span-2 min-h-24",
  "aside-cart": "",
  "aside-recent": "",
};

function SlotBox({ view }: { view: SlotView }) {
  const owner = PIECES.find((p) => p.id === view.owner)!;
  return (
    <div className={cn("flex min-w-0 flex-col gap-0.5 rounded-md border p-2 text-xs", SLOT_TONE[view.shows], AREA[view.slot])}>
      <span className="flex flex-wrap items-center justify-between gap-1 font-medium">
        {owner.name}
        {view.shows !== "content" ? <span className={cn(view.shows === "wrong" && "text-destructive")}>{SLOT_STATE[view.shows]}</span> : null}
      </span>
      <span className="text-foreground/85">{view.text}</span>
    </div>
  );
}

export function DeployDemo() {
  const [state, setState] = useState(INITIAL_STATE);
  const [isolation, setIsolation] = useState(true);
  const page = outcome(state, isolation);

  function handleRelease(id: PieceId, kind: BuildKind) {
    setState((s) => release(s, id, kind));
  }

  function handleRollback(id: PieceId) {
    setState((s) => rollback(s, id));
  }

  function handleSlow(id: PieceId, slow: boolean) {
    setState((s) => setSlow(s, id, slow));
  }

  const manifest = Object.fromEntries(PIECES.map((p) => [p.id, current(state, p.id).version]));

  return (
    <div className="flex flex-col gap-5">
      <Toggle
        checked={isolation}
        onCheckedChange={setIsolation}
        title="Failure isolation in the shell"
        detail="An error boundary around each piece, a timeout and a fallback for each slot."
      />

      <ul className="grid gap-3 md:grid-cols-2">
        {PIECES.map((p) => {
          const build = current(state, p.id);
          return (
            <li key={p.id} className="flex flex-col gap-2 rounded-lg border p-3 text-sm">
              <p className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="font-medium">
                  {p.name} <span className="font-normal text-foreground/75">({p.team} team)</span>
                </span>
                <span className="font-mono text-xs">
                  v{build.version}
                  {build.kind !== "good" ? <span className="text-destructive"> · {KIND_NOTE[build.kind]}</span> : null}
                </span>
              </p>
              <div className="flex flex-wrap gap-2" role="group" aria-label={`Release ${p.name}`}>
                <Button size="sm" variant="outline" onClick={() => handleRelease(p.id, "good")}>
                  Release
                </Button>
                <Button size="sm" variant="outline" onClick={() => handleRelease(p.id, "crash")}>
                  Release a crash
                </Button>
                <Button size="sm" variant="outline" onClick={() => handleRelease(p.id, "contract")}>
                  Release a contract change
                </Button>
                <Button size="sm" variant="outline" disabled={state[p.id].history.length < 2} onClick={() => handleRollback(p.id)}>
                  Roll back
                </Button>
              </div>
              <label className="flex items-center gap-2 text-xs">
                <input type="checkbox" checked={state[p.id].slow} onChange={(e) => handleSlow(p.id, e.target.checked)} className="size-4 accent-primary" />
                Its server or CDN is slow
              </label>
            </li>
          );
        })}
      </ul>

      <div className="flex flex-col gap-2">
        <p className="font-mono text-xs break-all text-foreground/85">manifest.json {JSON.stringify(manifest)}</p>
        <div className="rounded-lg border p-2" aria-live="polite">
          <p className="mb-2 text-xs font-medium text-foreground/75">What the shopper sees on /products/espresso-grinder</p>
          {page.status === "down" ? (
            <div className="flex min-h-40 items-center justify-center rounded-md border border-dashed p-4 text-center text-sm text-foreground/85">{page.headline}</div>
          ) : page.status === "waiting" ? (
            <div className="flex min-h-40 flex-col items-center justify-center gap-2 rounded-md border border-dashed p-4 text-center text-sm text-foreground/85">
              <Loader2 aria-hidden className="size-5 motion-safe:animate-spin" />
              {page.headline}
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <div className="grid gap-2 sm:grid-cols-3">
                {page.slots.map((view) => (
                  <SlotBox key={view.slot} view={view} />
                ))}
              </div>
              <p className="text-sm">{page.headline}</p>
            </div>
          )}
        </div>
      </div>

      <ul className="flex flex-col gap-1 text-sm">
        {page.requirements.map((r) => (
          <li key={r.label}>
            <Verdict pass={r.met}>{r.label}</Verdict>
          </li>
        ))}
      </ul>
      <p className="text-xs text-foreground/75">
        Simplified. Each release bumps a minor version and only that piece&apos;s entry in the manifest changes; rolling back points the manifest at the previous
        build, which is still on the CDN. Without isolation the shell renders every piece in one tree and waits for all of them. With it, an error boundary catches a
        crash and a {TIMEOUT_MS / 1000} s timeout lets the rest of the page render first.
      </p>
    </div>
  );
}
