"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Choice } from "@/handbook/jwt/token-view";
import { Toggle, Verdict } from "@/handbook/ui";
import { cn } from "@/lib/utils";

import { LIBRARIES, negotiate, type Consumer, type LibraryId, type Options, type Status, type Strategy } from "./sharing";
import { PIECES, type PieceId } from "./store";

const LIBRARY_OPTIONS = [
  { value: "react", label: "react + react-dom (keeps state)" },
  { value: "dates", label: "date-fns (stateless)" },
] as const;
const STRATEGY_OPTIONS = [
  { value: "version-first", label: "Version first (MF 2.0 default)" },
  { value: "loaded-first", label: "Loaded first" },
] as const;

const STATUS_TEXT: Record<Status, string> = { ok: "shared", "own-copy": "own copy", warning: "warning", error: "error" };
const STATUS_CLASS: Record<Status, string> = {
  ok: "text-success",
  "own-copy": "text-[color-mix(in_oklch,var(--warning),black_35%)] dark:text-warning",
  warning: "text-[color-mix(in_oklch,var(--warning),black_35%)] dark:text-warning",
  error: "text-destructive",
};

const DEFAULT_OPTIONS: Options = { singleton: true, strictVersion: false, strategy: "version-first" };

function VersionSelect({ id, label, value, items, onChange }: { id: string; label: string; value: string; items: readonly string[]; onChange: (v: string) => void }) {
  const options = items.map((v) => ({ value: v, label: v }));

  function handleValueChange(next: string | null) {
    if (next) onChange(next);
  }

  return (
    <Select items={options} value={value} onValueChange={handleValueChange}>
      <SelectTrigger id={id} aria-label={label} size="sm" className="w-28 font-mono text-xs">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value} className="font-mono text-xs">
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function SharingDemo() {
  const [libraryId, setLibraryId] = useState<LibraryId>("react");
  const [consumers, setConsumers] = useState<Record<PieceId, Consumer>>(LIBRARIES.react.defaults);
  const [options, setOptions] = useState<Options>(DEFAULT_OPTIONS);

  const library = LIBRARIES[libraryId];
  const result = negotiate(library, consumers, options);

  function handleLibrary(next: LibraryId) {
    setLibraryId(next);
    setConsumers(LIBRARIES[next].defaults);
  }

  function handleAllCompatible() {
    const v = library.versions.at(-1)!;
    setConsumers((current) => {
      const next = { ...current };
      for (const p of PIECES) next[p.id] = { provides: v, accepts: `^${v.split(".")[0]}.0.0` };
      return next;
    });
  }

  function updateConsumer(id: PieceId, patch: Partial<Consumer>) {
    setConsumers((current) => ({ ...current, [id]: { ...current[id], ...patch } }));
  }

  function updateOptions(patch: Partial<Options>) {
    setOptions((current) => ({ ...current, ...patch }));
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <Choice legend="Shared library" value={libraryId} options={LIBRARY_OPTIONS} onChange={handleLibrary} />
        <Choice legend="Share strategy" value={options.strategy} options={STRATEGY_OPTIONS} onChange={(strategy: Strategy) => updateOptions({ strategy })} />
        <Toggle
          checked={options.singleton}
          onCheckedChange={(singleton) => updateOptions({ singleton })}
          title="Single copy only (singleton)"
          detail="One version for every piece, whatever ranges they ask for."
        />
        <Toggle
          checked={options.strictVersion}
          onCheckedChange={(strictVersion) => updateOptions({ strictVersion })}
          title="Strict version check"
          detail="Off by default for singletons; on by default for others that bundle their own copy."
        />
      </div>

      <div className="flex flex-wrap gap-2" role="group" aria-label="Version presets">
        <Button variant="outline" size="sm" onClick={handleAllCompatible}>
          Everyone on {library.versions.at(-1)}
        </Button>
        <Button variant="outline" size="sm" onClick={() => setConsumers(library.defaults)}>
          One team on an older major
        </Button>
      </div>

      <div role="region" aria-label="Shared versions per piece (scrollable)" tabIndex={0} className="relative overflow-x-auto rounded-lg border outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
        <table className="w-full min-w-[620px] text-xs">
          <caption className="sr-only">For each piece, the version it bundles, the range it accepts and the version it ends up using</caption>
          <thead className="text-left text-foreground/75">
            <tr>
              <th scope="col" className="px-3 py-2 font-medium">Piece</th>
              <th scope="col" className="px-3 py-2 font-medium">Bundles</th>
              <th scope="col" className="px-3 py-2 font-medium">Accepts</th>
              <th scope="col" className="px-3 py-2 font-medium">Result</th>
            </tr>
          </thead>
          <tbody>
            {result.resolutions.map((r) => {
              const p = PIECES.find((x) => x.id === r.piece)!;
              return (
                <tr key={r.piece} className="border-t align-top">
                  <th scope="row" className="px-3 py-2 text-left font-medium">
                    {p.name}
                    {p.id === "shell" ? <span className="block font-normal text-foreground/75">host, loads first</span> : null}
                  </th>
                  <td className="px-3 py-2">
                    <VersionSelect id={`share-${p.id}-provides`} label={`${p.name} bundles`} value={consumers[p.id].provides} items={library.versions} onChange={(provides) => updateConsumer(p.id, { provides })} />
                  </td>
                  <td className="px-3 py-2">
                    <VersionSelect id={`share-${p.id}-accepts`} label={`${p.name} accepts`} value={consumers[p.id].accepts} items={library.ranges} onChange={(accepts) => updateConsumer(p.id, { accepts })} />
                  </td>
                  <td className="px-3 py-2">
                    <span className={cn("font-medium", STATUS_CLASS[r.status])}>
                      {r.uses ?? "nothing"} · {STATUS_TEXT[r.status]}
                    </span>
                    <span className="mt-0.5 block text-foreground/85">{r.message}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col gap-1.5 rounded-lg border p-3 text-sm" aria-live="polite">
        <p>
          <Verdict pass={result.copies.length <= 1}>
            {result.copies.length} {result.copies.length === 1 ? "copy" : "copies"} of {library.name} on the page
          </Verdict>
          {result.copies.length > 1 ? <span className="text-foreground/85"> ({result.copies.join(", ")}): {result.extraKb} kB extra to download.</span> : null}
        </p>
        {result.broken ? (
          <p className="text-foreground/85">
            Two copies of React each keep their own hooks and context. Pieces that render in their own roots still work, at the cost of the bytes. But a component from
            one copy rendered inside a tree from the other (a shared provider, a widget passed between pieces) can&apos;t read that tree&apos;s context, and its hooks
            fail with &quot;Invalid hook call&quot;.
          </p>
        ) : result.copies.length > 1 ? (
          <p className="text-foreground/85">A stateless utility works fine in two copies: each piece calls its own functions. The only cost is the extra bytes.</p>
        ) : null}
        {result.resolutions.some((r) => r.status === "error") ? (
          <p className="text-foreground/85">A strict check turns the mismatch into a load failure, which the shell must catch and replace with a fallback.</p>
        ) : null}
      </div>
      <p className="text-xs text-foreground/75">
        Simplified from webpack 5 Module Federation&apos;s runtime, which MF 2.0 follows for these cases. Sizes are assumptions. Under &quot;loaded first&quot; the
        shell&apos;s copy is already in use when the others register, so it stays the singleton even when a higher version arrives. With plain import maps there is
        nothing to negotiate: the map names one URL per library, and every piece that imports it gets that copy.
      </p>
    </div>
  );
}
