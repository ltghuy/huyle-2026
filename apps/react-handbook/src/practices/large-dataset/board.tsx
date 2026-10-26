"use client";

import { ArrowDown, ArrowUp, ArrowUpDown, TrendingDown, TrendingUp } from "lucide-react";
import { memo, useEffect, useLayoutEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Instrument } from "@/server/practices/large-dataset/instruments.schema";

import type { Sort, SortColumn } from "./derive";
import { formatChange, formatPrice, formatTime, formatVolume } from "./format";
import { countRowRender, renderTimer, setRowsInPage } from "./metrics";

export const ROW_HEIGHT = 36;
const OVERSCAN = 8;

/** One column template for header and rows; wide enough to scroll on phones. */
const GRID = "grid min-w-[48rem] grid-cols-[5.5rem_minmax(9rem,1fr)_9rem_6.5rem_6.5rem_5.5rem_5.5rem] items-center gap-x-3 px-3";

const COLUMNS: { column: SortColumn; label: string; numeric?: boolean }[] = [
  { column: "symbol", label: "Symbol" },
  { column: "name", label: "Name" },
  { column: "sector", label: "Sector" },
  { column: "price", label: "Price", numeric: true },
  { column: "change", label: "Change %", numeric: true },
  { column: "volume", label: "Volume", numeric: true },
  { column: "updatedAt", label: "Updated", numeric: true },
];

type RowProps = {
  row: Instrument;
  /** Position in the board (0-based), for aria-rowindex. */
  index: number;
  selected: boolean;
  onSelect: (id: number) => void;
  /** Windowed rows are positioned; full rows flow. */
  top: number | null;
};

function Row({ row, index, selected, onSelect, top }: RowProps) {
  countRowRender();
  const up = row.change >= 0;
  const Trend = up ? TrendingUp : TrendingDown;
  return (
    <div
      role="row"
      aria-rowindex={index + 2}
      style={top === null ? undefined : { transform: `translateY(${top}px)` }}
      className={cn(
        GRID,
        "h-9 border-b text-sm",
        top !== null && "absolute inset-x-0 top-0",
        selected ? "bg-primary/10" : "hover:bg-muted/50",
      )}
    >
      <div role="cell">
        <button
          type="button"
          aria-pressed={selected}
          onClick={() => onSelect(row.id)}
          className="rounded-sm font-mono font-medium outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          {row.symbol}
        </button>
      </div>
      <div role="cell" className="truncate">{row.name}</div>
      <div role="cell" className="truncate text-foreground/75">{row.sector}</div>
      <div role="cell" className="text-right tabular-nums">{formatPrice(row.price)}</div>
      <div role="cell" className={cn("flex items-center justify-end gap-1 tabular-nums", up ? "text-success" : "text-destructive")}>
        <Trend aria-hidden className="size-3.5" />
        {formatChange(row.change)}
      </div>
      <div role="cell" className="text-right tabular-nums">{formatVolume(row.volume)}</div>
      <div role="cell" className="text-right font-mono text-xs tabular-nums text-foreground/75">{formatTime(row.updatedAt)}</div>
    </div>
  );
}

/** Same component behind `memo`: skips rows whose props didn't change. */
const MemoRow = memo(Row);

export type BoardProps = {
  rows: Instrument[];
  selectedId: number | null;
  /** Stable when rows are memoized; see the demo. */
  onSelect: (id: number) => void;
  sort: Sort;
  onSort: (column: SortColumn) => void;
  windowing: boolean;
  memoRows: boolean;
  onClearFilter: () => void;
  scrollRef: React.RefObject<HTMLDivElement | null>;
};

/**
 * Always `memo`: an urgent render (a keystroke) can skip the whole board.
 * That only works if no prop changes in that render, so the "updating" cue
 * lives outside, on a wrapper.
 */
export const Board = memo(function Board({
  rows, selectedId, onSelect, sort, onSort, windowing, memoRows, onClearFilter, scrollRef,
}: BoardProps) {
  renderTimer.startIfIdle();
  const [scrollTop, setScrollTop] = useState(0);
  const [viewport, setViewport] = useState(480);
  const headerRef = useRef<HTMLDivElement>(null);

  const RowComponent = memoRows ? MemoRow : Row;
  const total = rows.length * ROW_HEIGHT;
  // The browser clamps scrollTop when the list shrinks; clamp here too so the
  // first render after a filter already shows the last rows, not a gap.
  const top = Math.min(scrollTop, Math.max(0, total - viewport));
  const start = windowing ? Math.max(0, Math.floor(top / ROW_HEIGHT) - OVERSCAN) : 0;
  const end = windowing ? Math.min(rows.length, Math.ceil((top + viewport) / ROW_HEIGHT) + OVERSCAN) : rows.length;
  const rendered = end - start;

  // After every commit of the board: the update is on screen.
  useLayoutEffect(() => {
    setRowsInPage(rendered);
    renderTimer.end();
  });

  useEffect(() => {
    const box = scrollRef.current!;
    const resize = new ResizeObserver(() => setViewport(box.clientHeight - (headerRef.current?.offsetHeight ?? 0)));
    resize.observe(box);
    return () => resize.disconnect();
  }, [scrollRef]);

  function handleScroll(e: React.UIEvent<HTMLDivElement>) {
    // Without windowing, scrolling needs no render at all.
    if (!windowing) return;
    renderTimer.start();
    setScrollTop(e.currentTarget.scrollTop);
  }

  const body = [];
  for (let i = start; i < end; i++) {
    const row = rows[i];
    body.push(
      <RowComponent
        key={row.id}
        row={row}
        index={i}
        selected={row.id === selectedId}
        // Memoized rows get the stable callback; plain rows get a new one
        // per render, as naive code usually does.
        onSelect={memoRows ? onSelect : (id) => onSelect(id)}
        top={windowing ? i * ROW_HEIGHT : null}
      />,
    );
  }

  return (
    <div
      ref={scrollRef}
      onScroll={handleScroll}
      className="relative isolate h-[30rem] overflow-auto rounded-lg border"
    >
      <div role="table" aria-label="Instruments" aria-rowcount={rows.length + 1}>
        <div role="rowgroup" ref={headerRef} className="sticky top-0 z-10 w-fit min-w-full bg-muted">
          <div role="row" aria-rowindex={1} className={cn(GRID, "h-9 border-b text-xs font-medium")}>
            {COLUMNS.map(({ column, label, numeric }) => {
              const sorted = sort?.column === column ? sort.dir : null;
              const Icon = sorted === "asc" ? ArrowUp : sorted === "desc" ? ArrowDown : ArrowUpDown;
              return (
                <div
                  key={column}
                  role="columnheader"
                  aria-sort={sorted === "asc" ? "ascending" : sorted === "desc" ? "descending" : undefined}
                  className={numeric ? "text-right" : undefined}
                >
                  <button
                    type="button"
                    onClick={() => onSort(column)}
                    className={cn(
                      "inline-flex items-center gap-1 rounded-sm outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50",
                      numeric && "flex-row-reverse",
                    )}
                  >
                    {label}
                    <Icon aria-hidden className={cn("size-3.5", sorted ? "text-foreground" : "text-foreground/40")} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
        <div
          role="rowgroup"
          className="relative min-w-[48rem]"
          style={windowing ? { height: total } : undefined}
        >
          {rows.length === 0 ? (
            <div role="row" className="flex h-40 flex-col items-center justify-center gap-2 text-sm">
              <div role="cell" className="flex flex-col items-center gap-2">
                <p className="font-medium">No instruments match</p>
                <Button variant="outline" size="sm" onClick={onClearFilter}>Clear filter</Button>
              </div>
            </div>
          ) : (
            body
          )}
        </div>
      </div>
    </div>
  );
});
