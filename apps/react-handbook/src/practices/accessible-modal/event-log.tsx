"use client";

import { Eraser } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { modalStore, useModalLog } from "./modal-store";

const timeFormat = new Intl.DateTimeFormat("en-US", { timeStyle: "medium" });
const TYPE_DOT = { open: "bg-info", close: "bg-success", blocked: "bg-warning" };

export function EventLog() {
  const log = useModalLog();

  return (
    <section aria-labelledby="modal-log-heading" className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <h3 id="modal-log-heading" className="text-sm font-medium">
          Event log
        </h3>
        <Button variant="ghost" size="sm" onClick={modalStore.clearLog} disabled={log.length === 0}>
          <Eraser aria-hidden /> Clear log
        </Button>
      </div>
      {log.length === 0 ? (
        <p className="rounded-lg border border-dashed p-3 text-foreground/75">
          Open a dialog: each open, close and ignored dismissal shows up here with where focus went.
        </p>
      ) : (
        <ol tabIndex={0} aria-label="Modal events, newest first" className="relative flex max-h-64 flex-col divide-y overflow-y-auto rounded-lg border font-mono text-xs outline-none focus-visible:ring-2 focus-visible:ring-primary">
          {log.map((entry) => (
            <li key={entry.id} className="flex flex-wrap gap-x-3 gap-y-0.5 px-3 py-2">
              <span className="text-foreground/75 tabular-nums">{timeFormat.format(entry.at)}</span>
              <span className="inline-flex items-center gap-1.5 font-medium text-foreground uppercase">
                <span aria-hidden className={cn("size-2 rounded-full", TYPE_DOT[entry.type])} />
                {entry.type}
              </span>
              <span className="text-foreground">{entry.title}</span>
              <span className="text-foreground/75">{entry.detail}</span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
