"use client";

import { useState } from "react";

import { cn } from "@/lib/utils";

import { type Loss, MSS, slowStart } from "./slow-start";

const SIZES = [
  { kb: 14, label: "14 KB (fits the first window)" },
  { kb: 100, label: "100 KB" },
  { kb: 500, label: "500 KB" },
  { kb: 2000, label: "2 MB" },
];

const LOSSES: { id: Loss; label: string }[] = [
  { id: "none", label: "No loss" },
  { id: "once", label: "One packet lost" },
  { id: "often", label: "About 0.7% lost (busy Wi-Fi)" },
];

const MAX_BARS = 24;

export function SlowStartDemo() {
  const [sizeKB, setSizeKB] = useState(500);
  const [loss, setLoss] = useState<Loss>("none");
  const rtt = 100;
  const result = slowStart({ sizeKB, rtt, loss });
  const peak = Math.max(...result.rounds.map((r) => r.cwnd));
  const shown = result.rounds.slice(0, MAX_BARS);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-x-8 gap-y-3">
        <Choice legend="File size" name="ss-size" options={SIZES.map((s) => ({ id: String(s.kb), label: s.label }))} value={String(sizeKB)} onChange={(v) => setSizeKB(Number(v))} />
        <Choice legend="Network" name="ss-loss" options={LOSSES} value={loss} onChange={(v) => setLoss(v as Loss)} />
      </div>

      <div aria-live="polite" className="grid grid-cols-3 gap-2">
        <Stat label="Segments" value={`${result.segments.toLocaleString("en-US")}`} />
        <Stat label="Round trips (incl. handshake)" value={String(result.roundTrips)} />
        <Stat label={`Time at ${rtt} ms RTT`} value={`${(result.time / 1000).toFixed(1)} s`} />
      </div>

      <figure className="flex flex-col gap-2">
        <figcaption className="text-xs font-medium">Simulated: segments TCP may send in each round trip (window, {MSS.toLocaleString("en-US")} B each)</figcaption>
        <ol className="flex h-32 items-end gap-1 border-b">
          {shown.map((round) => (
            <li key={round.round} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1">
              <span className="sr-only">
                Round {round.round}: window {round.cwnd}, sent {round.sent}
                {round.lost ? ", a segment was lost" : ""}
              </span>
              <span
                aria-hidden
                className={cn("w-full rounded-t-sm", round.lost ? "bg-destructive" : "bg-primary/70")}
                style={{ height: `${Math.max(2, (round.cwnd / peak) * 100)}%` }}
              />
            </li>
          ))}
        </ol>
        <p className="text-xs text-muted-foreground">
          {result.rounds.length > MAX_BARS ? `First ${MAX_BARS} of ${result.rounds.length} round trips. ` : ""}
          Red: a lost segment, so the window halves and then grows by one per round trip.
        </p>
      </figure>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-lg border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-mono text-lg font-semibold tabular-nums">{value}</p>
    </div>
  );
}

function Choice({
  legend,
  name,
  options,
  value,
  onChange,
}: {
  legend: string;
  name: string;
  options: { id: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <fieldset className="flex flex-col gap-1.5">
      <legend className="mb-1 text-sm font-medium">{legend}</legend>
      {options.map((option) => (
        <label key={option.id} className="flex items-center gap-2 text-sm">
          <input type="radio" name={name} checked={value === option.id} onChange={() => onChange(option.id)} className="size-4 accent-primary" />
          {option.label}
        </label>
      ))}
    </fieldset>
  );
}
