import { Check } from "lucide-react";
import { memo } from "react";

import { cn } from "@/lib/utils";

import { PRIORITIES, type Ticket } from "./tickets";
import type { VirtualRow } from "./virtualizer";

export const numberFormat = new Intl.NumberFormat("en-US");
export const dateFormat = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "UTC",
});

const PRIORITY_DOT = ["bg-destructive", "bg-warning", "bg-info", "bg-muted-foreground"];

export function ticketLabel(ticket: Ticket) {
  return `Ticket #${numberFormat.format(ticket.id)}, ${PRIORITIES[ticket.priority]}, ${ticket.status}: ${ticket.title}`;
}

export function PriorityBadge({ priority }: { priority: number }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span aria-hidden className={cn("size-2 rounded-full", PRIORITY_DOT[priority])} />
      {PRIORITIES[priority]}
    </span>
  );
}

/**
 * One option of the list box. `offset` positions it inside the virtual
 * spacer; without it the row sits in normal flow (naive mode).
 */
export const TicketRow = memo(function TicketRow({
  ticket,
  position,
  setSize,
  tabbable,
  selected,
  offset,
  debug,
}: {
  ticket: Ticket;
  /** 1-based position in the current list. */
  position: number;
  setSize: number;
  tabbable: boolean;
  selected: boolean;
  offset?: number;
  debug?: VirtualRow | null;
}) {
  return (
    <div
      role="option"
      aria-selected={selected}
      aria-posinset={position}
      aria-setsize={setSize}
      aria-label={ticketLabel(ticket)}
      tabIndex={tabbable ? 0 : -1}
      data-key={ticket.key}
      style={offset === undefined ? undefined : { transform: `translateY(${offset}px)` }}
      className={cn(
        "flex cursor-default flex-col gap-1 border-b px-4 py-3 text-sm outline-none select-none",
        "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary",
        "aria-selected:bg-accent aria-selected:before:absolute aria-selected:before:inset-y-0 aria-selected:before:left-0 aria-selected:before:w-0.75 aria-selected:before:bg-primary",
        offset === undefined ? "relative" : "absolute inset-x-0 top-0",
        debug && (debug.overscan ? "bg-warning/10" : "bg-info/5"),
      )}
    >
      {debug ? (
        <span aria-hidden className="self-start rounded bg-background/90 px-1 font-mono text-xs text-foreground/75 tabular-nums">
          row {numberFormat.format(debug.index + 1)} · {Math.round(debug.size)} px{" "}
          {debug.measured ? "measured" : "est."}
          {debug.overscan ? " · overscan" : ""}
        </span>
      ) : null}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-foreground/75">
        <span className="font-mono text-foreground tabular-nums">#{numberFormat.format(ticket.id)}</span>
        <PriorityBadge priority={ticket.priority} />
        <span className="capitalize">{ticket.status}</span>
        <span>{ticket.requester}</span>
        <span className="tabular-nums">{dateFormat.format(ticket.createdAt)}</span>
      </div>
      <p className="flex items-start gap-1.5 font-medium text-foreground">
        {selected ? <Check aria-hidden className="mt-0.5 size-4 shrink-0" /> : null}
        {ticket.title}
      </p>
      {ticket.body ? <p className="text-foreground/75">{ticket.body}</p> : null}
    </div>
  );
});
