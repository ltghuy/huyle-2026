import { EyeOff } from "lucide-react";

import type { Instrument } from "@/server/practices/large-dataset/instruments.schema";

import { formatChange, formatCount, formatPrice, formatTime } from "./format";

export function DetailsPanel({ instrument, hiddenByFilter }: { instrument: Instrument | null; hiddenByFilter: boolean }) {
  return (
    <section aria-labelledby="details-heading" className="flex flex-col gap-2 rounded-xl border p-4 text-sm">
      <h3 id="details-heading" className="font-semibold">Selected instrument</h3>
      {instrument ? (
        <>
          {hiddenByFilter ? (
            <p className="flex items-center gap-2 text-xs text-foreground/75">
              <EyeOff aria-hidden className="size-3.5" /> Hidden by the current filter
            </p>
          ) : null}
          <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1 sm:grid-cols-[auto_minmax(0,1fr)_auto_minmax(0,1fr)] lg:grid-cols-[auto_minmax(0,1fr)_auto_minmax(0,1fr)_auto_minmax(0,1fr)]">
            <dt className="text-foreground/75">Symbol</dt>
            <dd className="font-mono font-medium">{instrument.symbol}</dd>
            <dt className="text-foreground/75">Name</dt>
            <dd className="truncate">{instrument.name}</dd>
            <dt className="text-foreground/75">Sector</dt>
            <dd>{instrument.sector}</dd>
            <dt className="text-foreground/75">Price</dt>
            <dd className="tabular-nums">{formatPrice(instrument.price)}</dd>
            <dt className="text-foreground/75">Change</dt>
            <dd className="tabular-nums">{formatChange(instrument.change)} {instrument.change >= 0 ? "up" : "down"}</dd>
            <dt className="text-foreground/75">Volume</dt>
            <dd className="tabular-nums">{formatCount(instrument.volume)}</dd>
            <dt className="text-foreground/75">Updated</dt>
            <dd className="font-mono tabular-nums">{formatTime(instrument.updatedAt)}</dd>
          </dl>
        </>
      ) : (
        <p className="text-muted-foreground">Select a symbol to follow it live.</p>
      )}
    </section>
  );
}
