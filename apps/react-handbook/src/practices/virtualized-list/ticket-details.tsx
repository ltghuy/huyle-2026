import { FilterX, MousePointerClick } from "lucide-react";

import { dateFormat, numberFormat, PriorityBadge } from "./ticket-row";
import type { Ticket } from "./tickets";

export function TicketDetails({ ticket, inList }: { ticket: Ticket | null; inList: boolean }) {
  return (
    <section aria-labelledby="ticket-details-heading" className="flex flex-col gap-3 rounded-lg border bg-card p-4 text-sm">
      <h3 id="ticket-details-heading" className="text-xs font-medium text-muted-foreground">
        Selected ticket
      </h3>
      {ticket ? (
        <>
          <p className="font-mono text-xs tabular-nums">#{numberFormat.format(ticket.id)}</p>
          <p className="font-medium">{ticket.title}</p>
          {!inList ? (
            <p className="flex items-center gap-1.5 text-xs text-foreground/75">
              <FilterX aria-hidden className="size-3.5" /> Not in the current filter
            </p>
          ) : null}
          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
            <dt className="text-muted-foreground">Priority</dt>
            <dd><PriorityBadge priority={ticket.priority} /></dd>
            <dt className="text-muted-foreground">Status</dt>
            <dd className="capitalize">{ticket.status}</dd>
            <dt className="text-muted-foreground">Requester</dt>
            <dd>{ticket.requester}</dd>
            <dt className="text-muted-foreground">Created</dt>
            <dd className="tabular-nums">{dateFormat.format(ticket.createdAt)} UTC</dd>
          </dl>
          <p className="text-foreground/75">{ticket.body || "No description."}</p>
        </>
      ) : (
        <p className="flex items-start gap-2 text-foreground/75">
          <MousePointerClick aria-hidden className="mt-0.5 size-4 shrink-0" />
          Click a ticket, or focus the list and press Enter, to see its details here.
        </p>
      )}
    </section>
  );
}
