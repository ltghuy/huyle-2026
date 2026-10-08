"use client";

import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { useId } from "react";

import { Button } from "@/components/ui/button";
import { PAGE_SIZES, type PageSize } from "@/server/practices/data-grid/grid.schema";

import { formatCount } from "./format";
import type { GridController } from "./grid-controller";

export function Pager({
  controller,
  page,
  pageCount,
  pageSize,
  total,
}: {
  controller: GridController;
  page: number;
  pageCount: number;
  pageSize: PageSize;
  total: number;
}) {
  const id = useId();
  const first = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const last = Math.min(total, page * pageSize);

  function commitPage(input: HTMLInputElement) {
    const value = Number(input.value);
    controller.setPage(Number.isFinite(value) ? value : page);
    // Show the clamped page even when the controller had nothing to change.
    input.value = String(Math.min(Math.max(1, Math.round(value) || 1), pageCount));
  }

  function handlePageKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") commitPage(e.currentTarget);
  }

  return (
    <nav aria-label="Pagination" className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 text-sm">
      <p className="text-foreground/75 tabular-nums">
        {total === 0 ? "No results" : `Showing ${formatCount(first)}–${formatCount(last)} of ${formatCount(total)}`}
      </p>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <div className="flex items-center gap-2">
          <label htmlFor={`${id}-size`} className="text-foreground/75">Rows per page</label>
          <select
            id={`${id}-size`}
            value={pageSize}
            onChange={(e) => controller.setPageSize(Number(e.target.value) as PageSize)}
            className="h-8 rounded-lg border border-input bg-background px-2 text-sm dark:bg-input/30"
          >
            {PAGE_SIZES.map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon" aria-label="First page" disabled={page <= 1} onClick={() => controller.setPage(1)}>
            <ChevronsLeft />
          </Button>
          <Button variant="outline" size="icon" aria-label="Previous page" disabled={page <= 1} onClick={() => controller.setPage(page - 1)}>
            <ChevronLeft />
          </Button>
          <span className="flex items-center gap-1.5 px-1">
            <label htmlFor={`${id}-page`}>Page</label>
            <input
              key={`${page}/${pageCount}`}
              id={`${id}-page`}
              type="number"
              inputMode="numeric"
              min={1}
              max={pageCount}
              defaultValue={page}
              onKeyDown={handlePageKeyDown}
              onBlur={(e) => commitPage(e.currentTarget)}
              className="h-8 w-16 rounded-lg border border-input bg-background px-2 text-center tabular-nums dark:bg-input/30"
            />
            <span className="tabular-nums">of {formatCount(pageCount)}</span>
          </span>
          <Button variant="outline" size="icon" aria-label="Next page" disabled={page >= pageCount} onClick={() => controller.setPage(page + 1)}>
            <ChevronRight />
          </Button>
          <Button variant="outline" size="icon" aria-label="Last page" disabled={page >= pageCount} onClick={() => controller.setPage(pageCount)}>
            <ChevronsRight />
          </Button>
        </div>
      </div>
    </nav>
  );
}
