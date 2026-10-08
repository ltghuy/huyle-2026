"use client";

import { Keyboard } from "lucide-react";
import { useId, useState } from "react";

import { DemoControls } from "@/components/playground/demo-controls";
import { DemoStage } from "@/components/playground/demo-stage";
import { Button } from "@/components/ui/button";
import {
  COLUMNS,
  DATASET_SIZES,
  type ColumnId,
  type DatasetSize,
  type GridView,
  type QueryResult,
} from "@/server/practices/data-grid/grid.schema";

import { DataGrid, type Widths } from "./data-grid";
import { FilterBar } from "./filter-bar";
import { formatCount } from "./format";
import type { Mode } from "./grid-controller";
import { GridStats, GridStatus } from "./grid-stats";
import { Pager } from "./pager";
import { SelectionBar } from "./selection-bar";
import { useGridController } from "./use-grid";

const DEFAULT_WIDTHS = Object.fromEntries(COLUMNS.map((c) => [c.id, c.defaultWidth])) as Widths;
const MODES: { value: Mode; label: string }[] = [
  { value: "browser", label: "In the browser" },
  { value: "server", label: "On the server" },
];
const SIZES = DATASET_SIZES.map((n) => ({ value: String(n), label: `${formatCount(n)} employees` }));

const SHORTCUTS = [
  ["Tab", "Enter or leave the grid (one tab stop)"],
  ["Arrow keys", "Move between cells"],
  ["Home / End", "First / last cell of the row (with Ctrl: of the page)"],
  ["Page Up / Page Down", "Previous / next page"],
  ["Enter or Space on a header", "Sort (Shift: add as next sort key)"],
  ["Alt + ← / → on a header", "Resize by 10 px (Shift: 50 px); Alt + 0 resets"],
  ["Space on a row", "Select or deselect (Shift: the range from the last one)"],
] as const;

export function Demo({
  initialView,
  initialResult,
  initialSize,
}: {
  initialView: GridView;
  initialResult: QueryResult;
  initialSize: DatasetSize;
}) {
  const { controller, snapshot } = useGridController(initialView, initialResult, initialSize);
  const [widths, setWidths] = useState<Widths>(DEFAULT_WIDTHS);
  const ids = { mode: useId(), size: useId(), latency: useId(), fail: useId() };
  const { network, view, result } = snapshot;

  function handleResize(column: ColumnId, width: number) {
    setWidths((w) => ({ ...w, [column]: width }));
  }

  function handleResetWidth(column: ColumnId) {
    setWidths((w) => ({ ...w, [column]: DEFAULT_WIDTHS[column] }));
  }

  return (
    <>
      <DemoControls>
        <Select id={ids.mode} label="Sort, filter and page" value={snapshot.mode} options={MODES} onChange={(v) => controller.setMode(v as Mode)} />
        <Select id={ids.size} label="Dataset" value={String(snapshot.size)} options={SIZES} onChange={(v) => controller.setSize(Number(v) as DatasetSize)} />
        <Range id={ids.latency} label={`Server latency: ${network.latencyMs} ms (+ up to 50%)`} min={0} max={2000} step={100} value={network.latencyMs} onChange={(v) => controller.setNetwork({ latencyMs: v })} />
        <Range id={ids.fail} label={`Failure rate: ${Math.round(network.failRate * 100)}%`} min={0} max={100} step={10} value={Math.round(network.failRate * 100)} onChange={(v) => controller.setNetwork({ failRate: v / 100 })} />
      </DemoControls>

      <DemoStage>
        <div className="flex flex-col gap-4">
          <FilterBar controller={controller} view={view} total={result.total} datasetSize={snapshot.size} pending={snapshot.pending} />
          <SelectionBar controller={controller} snapshot={snapshot} />
          <div className="flex flex-col gap-2">
            <GridStatus snapshot={snapshot} onRetry={() => controller.retry()} />
            <DataGrid controller={controller} snapshot={snapshot} widths={widths} onResize={handleResize} onResetWidth={handleResetWidth} />
          </div>
          <Pager controller={controller} page={result.page} pageCount={result.pageCount} pageSize={view.pageSize} total={result.total} />
          <div className="flex flex-wrap items-start justify-between gap-3 border-t pt-3">
            <GridStats snapshot={snapshot} />
            <Button variant="outline" size="sm" onClick={() => setWidths(DEFAULT_WIDTHS)}>
              Reset widths
            </Button>
          </div>
          <details className="text-sm">
            <summary className="flex w-fit cursor-pointer items-center gap-2 rounded-md font-medium outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
              <Keyboard aria-hidden className="size-4 text-muted-foreground" /> Keyboard shortcuts
            </summary>
            <dl className="mt-2 grid gap-x-4 gap-y-1 sm:grid-cols-[minmax(10rem,auto)_1fr]">
              {SHORTCUTS.map(([keys, action]) => (
                <div key={keys} className="contents">
                  <dt className="font-mono text-xs text-foreground">{keys}</dt>
                  <dd className="mb-1 text-foreground/75 sm:mb-0">{action}</dd>
                </div>
              ))}
            </dl>
          </details>
        </div>
      </DemoStage>
    </>
  );
}

type Option = { value: string; label: string };

function Select({ id, label, value, options, onChange }: {
  id: string; label: string; value: string; options: Option[]; onChange: (value: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-xs font-medium text-muted-foreground">{label}</label>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value)} className="h-8 rounded-md border bg-background px-2 text-sm">
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}

function Range({ id, label, min, max, step, value, onChange }: {
  id: string; label: string; min: number; max: number; step: number; value: number; onChange: (value: number) => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-xs font-medium text-muted-foreground">{label}</label>
      <input id={id} type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="h-8 w-40 accent-primary" />
    </div>
  );
}
