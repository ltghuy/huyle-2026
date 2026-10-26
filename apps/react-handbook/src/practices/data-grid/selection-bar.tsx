"use client";

import { Info, X } from "lucide-react";

import { Button } from "@/components/ui/button";

import { formatCount } from "./format";
import type { GridController, GridSnapshot } from "./grid-controller";
import { pageState } from "./selection";

/** Selection summary, the "select all matching" banner, and notices. */
export function SelectionBar({ controller, snapshot }: { controller: GridController; snapshot: GridSnapshot }) {
  const { selection, selected, hiddenSelected, onlySelected, result, notice, pending } = snapshot;
  const pageIds = result.rows.map((r) => r.id);
  const wholePage = pageIds.length > 0 && pageState(selection, pageIds) === "all";
  const canSelectAll = !onlySelected && !pending && selection.kind === "ids" && wholePage && result.total > pageIds.length;

  return (
    <div className="flex flex-col gap-2 empty:hidden">
      {notice ? (
        <p role="status" className="flex items-start gap-2 rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-sm">
          <Info aria-hidden className="mt-0.5 size-4 shrink-0 text-warning" />
          <span className="flex-1">{notice}</span>
          <Button variant="ghost" size="icon-xs" aria-label="Dismiss" onClick={() => controller.dismissNotice()}>
            <X />
          </Button>
        </p>
      ) : null}

      {selected > 0 || onlySelected ? (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg bg-primary/5 px-3 py-2 text-sm">
          <p>
            <strong className="font-medium tabular-nums">{formatCount(selected)}</strong> selected
            {hiddenSelected > 0 ? (
              <span className="text-foreground/75"> · {formatCount(hiddenSelected)} hidden by filters</span>
            ) : null}
          </p>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={onlySelected}
              onChange={(e) => controller.setOnlySelected(e.target.checked)}
              className="size-4 accent-primary"
            />
            Show selected only
          </label>
          <Button variant="outline" size="sm" className="ml-auto" onClick={() => controller.clearSelection()}>
            Clear selection
          </Button>
        </div>
      ) : null}

      {canSelectAll ? (
        <p className="rounded-lg border px-3 py-2 text-center text-sm">
          All {pageIds.length} employees on this page are selected.{" "}
          <Button variant="link" size="sm" className="h-auto p-0" onClick={() => controller.selectAllMatching()}>
            Select all {formatCount(result.total)} matching employees
          </Button>
        </p>
      ) : null}
      {selection.kind === "all" && !onlySelected ? (
        <p className="rounded-lg border px-3 py-2 text-center text-sm">
          All {formatCount(selected)} matching employees are selected
          {selection.except.size ? ` (${formatCount(selection.except.size)} deselected)` : ""}.{" "}
          <Button variant="link" size="sm" className="h-auto p-0" onClick={() => controller.clearSelection()}>
            Clear selection
          </Button>
        </p>
      ) : null}
    </div>
  );
}
