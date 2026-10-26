"use client";

import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { memo, useId, useLayoutEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { Highlight } from "@/practices/searchable-accordion/highlight";
import { highlightRanges, searchTerms } from "@/server/practices/data-grid/grid.query";
import { COLUMNS, type Column, type ColumnId, type Employee, type SortKey } from "@/server/practices/data-grid/grid.schema";

import { ColumnResizer, clampWidth } from "./column-resizer";
import { formatCount, formatDay, formatMoney } from "./format";
import type { GridController, GridSnapshot } from "./grid-controller";
import { isSelected, pageState, type Selection } from "./selection";

// WAI-ARIA data grid on a native <table>: one tab stop for the whole grid
// (roving tabIndex), arrow keys move between cells. Row 0 is the header;
// column 0 is the selection column, whose native checkbox is the cell's focus
// target. Cells carry `data-cell="row-col"` so focus can be restored by
// position after rows are replaced.

export type Widths = Record<ColumnId, number>;
type Cell = { row: number; col: number };

export const SELECT_COLUMN_WIDTH = 48;
const COL_COUNT = COLUMNS.length + 1;
const RESIZE_STEP = 10;
const RESIZE_STEP_LARGE = 50;
const ORDINALS = ["1st", "2nd", "3rd"];
const STATUS_DOT: Record<Employee["status"], string> = {
  Active: "bg-success",
  "On leave": "bg-warning",
  Contractor: "bg-info",
};

const cellFocus = "outline-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary";

/** `indeterminate` has no attribute; it can only be set from script. */
function indeterminate(value: boolean) {
  return (el: HTMLInputElement | null) => {
    if (el) el.indeterminate = value;
  };
}

function sortText(sort: SortKey[]) {
  return sort
    .map((k) => `${COLUMNS.find((c) => c.id === k.column)!.label} ${k.dir === "asc" ? "ascending" : "descending"}`)
    .join(", then ");
}

export function DataGrid({
  controller,
  snapshot,
  widths,
  onResize,
  onResetWidth,
}: {
  controller: GridController;
  snapshot: GridSnapshot;
  widths: Widths;
  onResize: (column: ColumnId, width: number) => void;
  onResetWidth: (column: ColumnId) => void;
}) {
  const { result, view, selection, pending, onlySelected, selected } = snapshot;
  const { rows } = result;
  const helpId = useId();
  const tableRef = useRef<HTMLTableElement>(null);
  const [active, setActive] = useState<Cell>({ row: 0, col: 1 });
  const [resized, setResized] = useState<{ label: string; width: number } | null>(null);
  /** Focus is (or was, until its cell was removed) inside the grid. */
  const focusInside = useRef(false);
  const moveFocus = useRef(false);

  // The focused row may no longer exist (smaller page, fewer results).
  const activeRow = Math.min(active.row, rows.length);
  const activeCol = active.col;
  const terms = useMemo(() => searchTerms(view.search), [view.search]);
  const headerState = pageState(selection, rows.map((r) => r.id));
  const pageOffset = (result.page - 1) * view.pageSize;
  const tableWidth = SELECT_COLUMN_WIDTH + COLUMNS.reduce((sum, c) => sum + widths[c.id], 0);

  // Keyboard moves focus here; and when the focused cell was replaced (new
  // page, new results), focus goes to the same position instead of <body>.
  useLayoutEffect(() => {
    const table = tableRef.current;
    if (!table) return;
    // Only take focus back from <body>; never from something else the user picked.
    const lost = focusInside.current && document.activeElement === document.body;
    if (!moveFocus.current && !lost) return;
    moveFocus.current = false;
    table.querySelector<HTMLElement>(`[data-cell="${activeRow}-${activeCol}"]`)?.focus();
  }, [activeRow, activeCol, rows]);

  function moveTo(cell: Cell) {
    moveFocus.current = true;
    setActive(cell);
  }

  function handleFocus(e: React.FocusEvent) {
    focusInside.current = true;
    const at = (e.target as HTMLElement).dataset.cell;
    if (!at) return;
    const [row, col] = at.split("-").map(Number);
    if (row !== activeRow || col !== activeCol) setActive({ row, col });
  }

  // Removing the focused cell (new page) also fires blur. Decide after the
  // commit: focus that left for <body> because its cell was removed is still
  // "inside", and the layout effect above has already moved it back.
  function handleBlur(e: React.FocusEvent) {
    const target = e.target as Node;
    queueMicrotask(() => {
      const active = document.activeElement;
      focusInside.current = !!tableRef.current?.contains(active) || (active === document.body && !target.isConnected);
    });
  }

  function resizeBy(column: Column, delta: number) {
    const width = clampWidth(widths[column.id] + delta);
    onResize(column.id, width);
    setResized({ label: column.label, width });
  }

  function handleResetWidth(column: Column) {
    onResetWidth(column.id);
    setResized({ label: column.label, width: column.defaultWidth });
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    // A key press here proves focus is inside, even if no focus event fired.
    focusInside.current = true;
    const lastRow = rows.length;
    const lastCol = COL_COUNT - 1;
    const row = activeRow;
    const col = activeCol;
    const column = col > 0 ? COLUMNS[col - 1] : null;
    const ctrl = e.ctrlKey || e.metaKey;

    if (row === 0 && column && e.altKey) {
      if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
        e.preventDefault();
        const step = e.shiftKey ? RESIZE_STEP_LARGE : RESIZE_STEP;
        resizeBy(column, e.key === "ArrowRight" ? step : -step);
        return;
      }
      if (e.code === "Digit0") {
        e.preventDefault();
        handleResetWidth(column);
        return;
      }
    }

    let next: Cell;
    switch (e.key) {
      case "ArrowRight": next = { row, col: Math.min(lastCol, col + 1) }; break;
      case "ArrowLeft": next = { row, col: Math.max(0, col - 1) }; break;
      case "ArrowDown": next = { row: Math.min(lastRow, row + 1), col }; break;
      case "ArrowUp": next = { row: Math.max(0, row - 1), col }; break;
      case "Home": next = ctrl ? { row: 0, col: 0 } : { row, col: 0 }; break;
      case "End": next = ctrl ? { row: lastRow, col: lastCol } : { row, col: lastCol }; break;
      case "PageDown":
      case "PageUp":
        e.preventDefault();
        controller.setPage(result.page + (e.key === "PageDown" ? 1 : -1));
        return;
      case "Enter":
      case " ":
        if (row === 0) {
          e.preventDefault();
          if (column) controller.toggleSort(column.id, e.shiftKey);
          else controller.setPageSelected(headerState !== "all");
        } else if (e.key === " ") {
          // Also stops the checkbox's own Space toggle: one path for both.
          e.preventDefault();
          controller.toggleRow(rows[row - 1].id, e.shiftKey);
        }
        return;
      default:
        return;
    }
    e.preventDefault();
    moveTo(next);
  }

  function handleHeaderClick(e: React.MouseEvent, column: Column) {
    controller.toggleSort(column.id, e.shiftKey);
  }

  const summary = pending
    ? ""
    : `${formatCount(result.total)} employees. ${view.sort.length ? `Sorted by ${sortText(view.sort)}.` : "Not sorted."} Page ${result.page} of ${result.pageCount}.`;

  return (
    <div className="flex flex-col">
      {/* relative: clips the cells' absolutely positioned sr-only text (it would
          otherwise widen the page); isolate: keeps the sticky header under the app bar. */}
      <div className="relative isolate max-h-[36rem] overflow-auto rounded-lg border">
        <table
          ref={tableRef}
          role="grid"
          aria-label="Employees"
          aria-describedby={helpId}
          aria-rowcount={result.total + 1}
          aria-colcount={COL_COUNT}
          aria-multiselectable
          aria-busy={pending || undefined}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          onBlur={handleBlur}
          style={{ width: tableWidth }}
          className="table-fixed border-separate border-spacing-0 text-sm [&_td]:border-b [&_th]:border-b"
        >
          <colgroup>
            <col style={{ width: SELECT_COLUMN_WIDTH }} />
            {COLUMNS.map((c) => (
              <col key={c.id} style={{ width: widths[c.id] }} />
            ))}
          </colgroup>
          <TableHeader className="sticky top-0 z-20 bg-muted">
            <TableRow aria-rowindex={1} className="hover:bg-transparent">
              <TableHead className="text-center">
                <input
                  type="checkbox"
                  data-cell="0-0"
                  tabIndex={activeRow === 0 && activeCol === 0 ? 0 : -1}
                  aria-label="Select all employees on this page"
                  checked={headerState === "all"}
                  ref={indeterminate(headerState === "some")}
                  disabled={rows.length === 0}
                  onChange={() => controller.setPageSelected(headerState !== "all")}
                  className={cn("size-4 align-middle accent-primary", cellFocus)}
                />
              </TableHead>
              {COLUMNS.map((column, i) => {
                const index = view.sort.findIndex((k) => k.column === column.id);
                const key = index === -1 ? null : view.sort[index];
                const SortIcon = !key ? ArrowUpDown : key.dir === "asc" ? ArrowUp : ArrowDown;
                return (
                  <TableHead
                    key={column.id}
                    data-cell={`0-${i + 1}`}
                    tabIndex={activeRow === 0 && activeCol === i + 1 ? 0 : -1}
                    aria-sort={index === 0 ? (key!.dir === "asc" ? "ascending" : "descending") : undefined}
                    onClick={(e) => handleHeaderClick(e, column)}
                    className={cn("relative cursor-pointer select-none hover:bg-accent", cellFocus, column.type === "number" && "text-right")}
                  >
                    <span className={cn("flex items-center gap-1 overflow-hidden", column.type === "number" && "justify-end")}>
                      <span className="truncate">{column.label}</span>
                      <SortIcon aria-hidden className={cn("size-3.5 shrink-0", key ? "text-foreground" : "text-foreground/40")} />
                      {key && view.sort.length > 1 ? (
                        <span aria-hidden className="text-[0.65rem] font-semibold tabular-nums">{index + 1}</span>
                      ) : null}
                      {key && index > 0 ? (
                        <span className="sr-only">{`, sorted ${ORDINALS[index]}, ${key.dir === "asc" ? "ascending" : "descending"}`}</span>
                      ) : null}
                    </span>
                    <ColumnResizer
                      width={widths[column.id]}
                      onResize={(width) => onResize(column.id, width)}
                      onReset={() => handleResetWidth(column)}
                    />
                  </TableHead>
                );
              })}
            </TableRow>
          </TableHeader>
          <GridBody
            controller={controller}
            rows={rows}
            selection={selection}
            terms={terms}
            pageOffset={pageOffset}
            activeRow={activeRow}
            activeCol={activeCol}
            pending={pending}
            onlySelected={onlySelected}
          />
        </table>
      </div>
      <p id={helpId} className="sr-only">
        Arrow keys move between cells. On a column header, Enter sorts, Shift+Enter adds a sort key, Alt+Left and Alt+Right
        resize the column. On a row, Space selects it, Shift+Space selects a range. Page Up and Page Down change page.
      </p>
      <div aria-live="polite" className="sr-only">{summary}</div>
      <div aria-live="polite" className="sr-only">{`${formatCount(selected)} selected`}</div>
      <div aria-live="polite" className="sr-only">{resized ? `${resized.label} column ${resized.width} pixels wide` : ""}</div>
    </div>
  );
}

type BodyProps = {
  controller: GridController;
  rows: Employee[];
  selection: Selection;
  terms: string[];
  pageOffset: number;
  activeRow: number;
  activeCol: number;
  pending: boolean;
  onlySelected: boolean;
};

/** Memoized: resizing a column re-renders the header and colgroup, not the rows. */
const GridBody = memo(function GridBody({
  controller,
  rows,
  selection,
  terms,
  pageOffset,
  activeRow,
  activeCol,
  pending,
  onlySelected,
}: BodyProps) {
  function handleCheck(e: React.ChangeEvent<HTMLInputElement>, id: string) {
    controller.toggleRow(id, (e.nativeEvent as MouseEvent).shiftKey ?? false);
  }

  // Shift+click would otherwise also select the text between the two rows.
  function handleCheckMouseDown(e: React.MouseEvent) {
    if (e.shiftKey) e.preventDefault();
  }

  if (rows.length === 0) {
    return (
      <TableBody>
        <TableRow className="hover:bg-transparent">
          <TableCell colSpan={COL_COUNT} className="h-40 text-center whitespace-normal">
            <div className="flex flex-col items-center gap-2">
              <p className="font-medium">{onlySelected ? "No selected employees match" : "No employees match these filters"}</p>
              {onlySelected ? (
                <Button variant="outline" size="sm" onClick={() => controller.setOnlySelected(false)}>Show all rows</Button>
              ) : (
                <Button variant="outline" size="sm" onClick={() => controller.clearFilters()}>Clear filters</Button>
              )}
            </div>
          </TableCell>
        </TableRow>
      </TableBody>
    );
  }

  return (
    <TableBody className={cn("motion-safe:transition-opacity", pending && "opacity-60")}>
      {rows.map((employee, i) => {
        const row = i + 1;
        const picked = isSelected(selection, employee.id);
        const tab = (col: number) => (activeRow === row && activeCol === col ? 0 : -1);
        return (
          <TableRow
            key={employee.id}
            aria-rowindex={pageOffset + i + 2}
            aria-selected={picked}
            data-state={picked ? "selected" : undefined}
          >
            <TableCell className="text-center">
              <input
                type="checkbox"
                data-cell={`${row}-0`}
                tabIndex={tab(0)}
                aria-label={`Select ${employee.name}`}
                checked={picked}
                onChange={(e) => handleCheck(e, employee.id)}
                onMouseDown={handleCheckMouseDown}
                className={cn("size-4 align-middle accent-primary", cellFocus)}
              />
            </TableCell>
            {COLUMNS.map((column, ci) => (
              <TableCell
                key={column.id}
                data-cell={`${row}-${ci + 1}`}
                tabIndex={tab(ci + 1)}
                title={cellTitle(employee, column)}
                className={cn("truncate", cellFocus, column.type === "number" && "text-right tabular-nums", column.type === "date" && "tabular-nums")}
              >
                <CellValue employee={employee} column={column} terms={terms} />
              </TableCell>
            ))}
          </TableRow>
        );
      })}
    </TableBody>
  );
});

function cellTitle(employee: Employee, column: Column) {
  switch (column.id) {
    case "salary": return formatMoney(employee.salary);
    case "startDate": return formatDay(employee.startDate);
    case "rating": return employee.rating === null ? "No rating" : `${employee.rating} out of 5`;
    default: return String(employee[column.id]);
  }
}

function CellValue({ employee, column, terms }: { employee: Employee; column: Column; terms: string[] }) {
  switch (column.id) {
    case "salary":
      return formatMoney(employee.salary);
    case "startDate":
      return formatDay(employee.startDate);
    case "rating":
      return employee.rating === null ? (
        <>
          <span aria-hidden className="text-foreground/60">—</span>
          <span className="sr-only">No rating</span>
        </>
      ) : (
        <>
          <span aria-hidden>{employee.rating} / 5</span>
          <span className="sr-only">{employee.rating} out of 5</span>
        </>
      );
    case "status":
      return (
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden className={cn("size-2 shrink-0 rounded-full", STATUS_DOT[employee.status])} />
          <Highlight text={employee.status} ranges={highlightRanges(employee.status, terms)} />
        </span>
      );
    default: {
      const text = employee[column.id];
      return (
        <span className={column.id === "name" ? "font-medium" : undefined}>
          <Highlight text={text} ranges={highlightRanges(text, terms)} />
        </span>
      );
    }
  }
}
