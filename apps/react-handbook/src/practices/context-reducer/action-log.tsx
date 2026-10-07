"use client";

import { Eraser } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatMoney, type Product } from "@/server/practices/context-reducer/shop.schema";

import type { Change } from "./cart";
import { RENDER_ROOT, RenderBadge, useRenderCount } from "./render-counter";
import { useShopDispatch, useShopSelector } from "./shop-context";
import { actions, type Action, type AppState, type LogEntry } from "./shop-reducer";
import { useCatalog } from "./shop-root";

const timeFormat = new Intl.DateTimeFormat("en-US", { timeStyle: "medium" });
const selectLog = (s: AppState) => s.log;
const selectHistory = (s: AppState) => s.history;

type Names = (id: string) => string;

function summary(action: Action, name: Names): string {
  switch (action.type) {
    case "cart/add":
    case "cart/remove":
      return name(action.productId);
    case "cart/setQty":
      return `${name(action.productId)} → ${action.qty}`;
    case "cart/applyDiscount":
      return action.code;
    case "history/jump":
      return `to state #${action.stateId}`;
    case "cart/hydrated":
      return action.notes.length > 0 ? action.notes.join(" ") : "restored from storage";
    case "cart/synced":
      return "from another tab";
    case "catalog/loaded":
      return `${action.count} products`;
    case "checkout/succeeded":
      return `${action.order.orderId} · ${formatMoney(action.order.total)}`;
    case "checkout/failed":
      return action.message;
    default:
      return "";
  }
}

function describeChange(change: Change, name: Names) {
  switch (change.kind) {
    case "added":
      return `${name(change.productId)} added (${change.qty})`;
    case "removed":
      return `${name(change.productId)} removed`;
    case "qty":
      return `${name(change.productId)} qty ${change.from} → ${change.to}`;
    case "discount":
      return `discount ${change.from ?? "—"} → ${change.to ?? "—"}`;
  }
}

function nameLookup(byId: ReadonlyMap<string, Product> | null): Names {
  return (id) => byId?.get(id)?.name ?? id;
}

export function ActionLog() {
  const badge = useRenderCount("Action log");
  const log = useShopSelector(selectLog);
  const history = useShopSelector(selectHistory);
  const dispatch = useShopDispatch();
  const { byId } = useCatalog();
  const name = nameLookup(byId);
  const currentId = history.states[history.index].id;
  const indexOf = new Map(history.states.map((s, i) => [s.id, i]));

  function stateLabel(entry: LogEntry) {
    if (entry.stateId === null) return null;
    const index = indexOf.get(entry.stateId);
    if (index === undefined) return "discarded";
    if (entry.stateId === currentId) return "current";
    return index > history.index ? "undone" : null;
  }

  return (
    <section data-render-root aria-labelledby="action-log-heading" className={cn("flex min-w-0 flex-col gap-2 p-1", RENDER_ROOT)}>
      <div className="flex items-center justify-between gap-2">
        <h3 id="action-log-heading" className="text-sm font-medium">
          Action log
        </h3>
        <div className="flex items-center gap-2">
          <RenderBadge badgeRef={badge} label="Action log" />
          <Button variant="ghost" size="sm" disabled={log.length === 0} onClick={() => dispatch(actions.clearLog())}>
            <Eraser aria-hidden /> Clear log
          </Button>
        </div>
      </div>
      {log.length === 0 ? (
        <p className="rounded-lg border border-dashed p-3 text-foreground/75">Every dispatched action appears here. Select a cart change to jump to the state right after it.</p>
      ) : (
        <ol tabIndex={0} aria-label="Actions, newest first" className="relative flex max-h-80 flex-col divide-y overflow-y-auto rounded-lg border font-mono text-xs outline-none focus-visible:ring-2 focus-visible:ring-primary">
          {log.map((entry) => {
            const label = stateLabel(entry);
            const jumpable = entry.stateId !== null && label !== "discarded" && label !== "current";
            const body = (
              <>
                <span className="flex flex-wrap items-baseline gap-x-2">
                  <span className="text-foreground/75 tabular-nums">{timeFormat.format(entry.at)}</span>
                  <span className="font-medium text-foreground">{entry.action.type}</span>
                  <span className="text-foreground/75">{summary(entry.action, name)}</span>
                  {label ? <span className="rounded border px-1 text-foreground/75">{label}</span> : null}
                </span>
                <span className="text-foreground/75">
                  {entry.changes.length > 0 ? entry.changes.map((c) => describeChange(c, name)).join(" · ") : "no change"}
                </span>
              </>
            );
            return (
              <li key={entry.id} className={cn((label === "undone" || label === "discarded") && "italic", label === "current" && "bg-accent")}>
                {jumpable ? (
                  <button
                    type="button"
                    onClick={() => dispatch(actions.jump(entry.stateId!))}
                    className="flex w-full flex-col gap-0.5 px-3 py-2 text-left hover:bg-muted focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary"
                    aria-label={`Jump to the state after ${entry.action.type} ${summary(entry.action, name)}`}
                  >
                    {body}
                  </button>
                ) : (
                  <div className="flex flex-col gap-0.5 px-3 py-2">{body}</div>
                )}
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
