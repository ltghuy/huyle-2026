"use client";

import { useEffect, useId, useState } from "react";

import { DemoControls } from "@/components/playground/demo-controls";
import { DemoStage } from "@/components/playground/demo-stage";
import { Button } from "@/components/ui/button";
import { toast } from "@/practices/toast-notifications/toast-store";

import { markUpdate } from "./list-stats";
import { TicketBrowser, type Mode } from "./ticket-browser";
import { numberFormat } from "./ticket-row";
import { ticketStore } from "./tickets";

const ROW_COUNTS = [1_000, 10_000, 20_000, 50_000, 100_000];
/** Naive rendering above this freezes the tab for seconds. */
const NAIVE_LIMIT = 20_000;

function markRowsReady() {
  markUpdate("rows");
}

export function Demo() {
  const [count, setCount] = useState(10_000);
  const [mode, setMode] = useState<Mode>("virtual");
  const [overscan, setOverscan] = useState(5);
  const [estimate, setEstimate] = useState(96);
  const [debug, setDebug] = useState(false);
  const ids = { rows: useId(), mode: useId(), overscan: useId(), estimate: useId(), limit: useId() };
  const naiveAllowed = count <= NAIVE_LIMIT;

  // When tickets had to be generated, time the list from when they're ready.
  useEffect(() => ticketStore.ensure(count, markRowsReady), [count]);

  function handleCount(next: number) {
    markUpdate("rows");
    if (next > NAIVE_LIMIT && mode === "naive") {
      setMode("virtual");
      toast.info("Switched to virtualized rendering", {
        description: `Naive mode is limited to ${numberFormat.format(NAIVE_LIMIT)} rows.`,
      });
    }
    setCount(next);
  }

  function handleMode(next: Mode) {
    if (next === mode) return;
    markUpdate("mode");
    setMode(next);
  }

  function handleOverscan(next: number) {
    markUpdate("settings");
    setOverscan(next);
  }

  function handleEstimate(next: number) {
    markUpdate("settings");
    setEstimate(next);
  }

  return (
    <>
      <DemoControls>
        <div className="flex flex-col gap-1">
          <label htmlFor={ids.rows} className="text-xs font-medium text-muted-foreground">
            Rows
          </label>
          <select
            id={ids.rows}
            value={count}
            onChange={(e) => handleCount(Number(e.target.value))}
            className="h-8 rounded-md border bg-background px-2 text-sm"
          >
            {ROW_COUNTS.map((n) => (
              <option key={n} value={n}>
                {numberFormat.format(n)}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <span id={ids.mode} className="text-xs font-medium text-muted-foreground">
            Rendering
          </span>
          <div role="group" aria-labelledby={ids.mode} aria-describedby={naiveAllowed ? undefined : ids.limit} className="flex">
            <Button
              variant={mode === "virtual" ? "default" : "outline"}
              aria-pressed={mode === "virtual"}
              onClick={() => handleMode("virtual")}
              className="rounded-r-none"
            >
              Virtualized
            </Button>
            <Button
              variant={mode === "naive" ? "default" : "outline"}
              aria-pressed={mode === "naive"}
              disabled={!naiveAllowed}
              onClick={() => handleMode("naive")}
              className="-ml-px rounded-l-none"
            >
              Naive (all rows)
            </Button>
          </div>
        </div>

        <Range id={ids.overscan} label="Overscan" unit=" rows" value={overscan} min={0} max={20} step={1} onChange={handleOverscan} />
        <Range id={ids.estimate} label="Estimated height" unit=" px" value={estimate} min={40} max={200} step={8} onChange={handleEstimate} />

        <label className="flex h-8 items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={debug}
            disabled={mode !== "virtual"}
            onChange={(e) => setDebug(e.target.checked)}
            className="size-4 accent-primary"
          />
          Debug view
        </label>

        {naiveAllowed ? null : (
          <p id={ids.limit} className="w-full text-xs text-muted-foreground">
            Naive mode is limited to {numberFormat.format(NAIVE_LIMIT)} rows: rendering more freezes the tab for seconds.
          </p>
        )}
      </DemoControls>

      <DemoStage>
        <TicketBrowser count={count} mode={mode} estimate={estimate} overscan={overscan} debug={debug && mode === "virtual"} />
      </DemoStage>
    </>
  );
}

function Range({
  id, label, unit, value, min, max, step, onChange,
}: {
  id: string; label: string; unit: string; value: number; min: number; max: number; step: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-xs font-medium text-muted-foreground">
        {label}: {value}
        {unit}
      </label>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-8 w-32 accent-primary"
      />
    </div>
  );
}
