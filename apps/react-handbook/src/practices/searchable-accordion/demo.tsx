"use client";

import { RefreshCw } from "lucide-react";
import { useEffect, useId, useReducer, useState } from "react";

import { DemoControls } from "@/components/playground/demo-controls";
import { DemoStage } from "@/components/playground/demo-stage";
import { Button } from "@/components/ui/button";
import type { FaqEntry } from "@/server/practices/searchable-accordion/faq.schema";

import {
  accordionReducer,
  INITIAL_ACCORDION_STATE,
  type ExpandMode,
} from "./accordion-state";
import { FaqAccordion, type FaqLoad } from "./faq-accordion";

type Size = "normal" | "large";
type FaqRequest = { size: Size; latencyMs: number; failRate: number; attempt: number };

async function fetchFaq(request: FaqRequest, signal: AbortSignal): Promise<FaqEntry[]> {
  const params = new URLSearchParams({
    size: request.size,
    latencyMs: String(request.latencyMs),
    failRate: String(request.failRate),
  });
  const res = await fetch(`/api/practices/searchable-accordion/faq?${params}`, { signal });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error?.message ?? `HTTP ${res.status}`);
  return json.data as FaqEntry[];
}

export function Demo() {
  const [state, dispatch] = useReducer(accordionReducer, INITIAL_ACCORDION_STATE);
  const [query, setQuery] = useState("");
  const [size, setSize] = useState<Size>("normal");
  const [latency, setLatency] = useState(600);
  const [failPercent, setFailPercent] = useState(0);
  const [request, setRequest] = useState<FaqRequest>({
    size: "normal",
    latencyMs: 600,
    failRate: 0,
    attempt: 0,
  });
  const [load, setLoad] = useState<FaqLoad>({ status: "loading" });
  const ids = { size: useId(), latency: useId(), fail: useId() };

  useEffect(() => {
    const controller = new AbortController();
    fetchFaq(request, controller.signal).then(
      (entries) => setLoad({ status: "ready", entries }),
      (error: unknown) => {
        if (controller.signal.aborted) return;
        setLoad({
          status: "error",
          message: error instanceof Error ? error.message : String(error),
        });
      },
    );
    return () => controller.abort();
  }, [request]);

  function reload(nextSize: Size = size) {
    setLoad({ status: "loading" });
    setRequest((current) => ({
      size: nextSize,
      latencyMs: latency,
      failRate: failPercent / 100,
      attempt: current.attempt + 1,
    }));
  }

  function handleReload() {
    reload();
  }

  function handleSizeChange(event: React.ChangeEvent<HTMLSelectElement>) {
    const next = event.target.value as Size;
    setSize(next);
    reload(next);
  }

  function handleModeChange(mode: ExpandMode) {
    dispatch({ type: "setMode", mode });
  }

  return (
    <>
      <DemoControls>
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium text-muted-foreground">Open sections</span>
          <div role="group" aria-label="Open sections" className="flex">
            <Button
              size="sm"
              variant={state.mode === "single" ? "default" : "outline"}
              aria-pressed={state.mode === "single"}
              className="rounded-r-none"
              onClick={() => handleModeChange("single")}
            >
              One at a time
            </Button>
            <Button
              size="sm"
              variant={state.mode === "multiple" ? "default" : "outline"}
              aria-pressed={state.mode === "multiple"}
              className="rounded-l-none"
              onClick={() => handleModeChange("multiple")}
            >
              Many
            </Button>
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor={ids.size} className="text-xs font-medium text-muted-foreground">
            Content size
          </label>
          <select
            id={ids.size}
            value={size}
            onChange={handleSizeChange}
            className="h-8 rounded-md border bg-background px-2 text-sm"
          >
            <option value="normal">Normal (~40)</option>
            <option value="large">Large (~400)</option>
          </select>
        </div>

        <Range id={ids.latency} label="Latency" unit="ms" value={latency} min={0} max={3000} step={100} onChange={setLatency} />
        <Range id={ids.fail} label="Failure rate" unit="%" value={failPercent} min={0} max={100} step={10} onChange={setFailPercent} />

        <Button variant="outline" size="sm" onClick={handleReload}>
          <RefreshCw aria-hidden /> Reload
        </Button>
      </DemoControls>

      <DemoStage>
        <FaqAccordion
          load={load}
          query={query}
          onQueryChange={setQuery}
          state={state}
          dispatch={dispatch}
          onRetry={handleReload}
        />
      </DemoStage>
    </>
  );
}

function Range({
  id,
  label,
  unit,
  value,
  min,
  max,
  step,
  onChange,
}: {
  id: string;
  label: string;
  unit: string;
  value: number;
  min: number;
  max: number;
  step: number;
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
        className="h-8 w-36 accent-primary"
      />
    </div>
  );
}
