import { cn } from "@/lib/utils";

import type { RunEvent } from "./bundler/runtime";

const LABEL: Record<RunEvent["kind"], string> = { evaluate: "run", cache: "cached", log: "console", fetch: "download", loaded: "downloaded", error: "error" };

/** The ordered list of what the runtime did and what the program logged. */
export function RunLog({ events, empty, label }: { events: RunEvent[]; empty: string; label: string }) {
  return (
    <div role="region" aria-label={label} aria-live="polite" tabIndex={0} className="max-h-80 overflow-auto rounded-lg border p-2 outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
      {events.length === 0 ? (
        <p className="text-xs text-muted-foreground">{empty}</p>
      ) : (
        <ol className="flex flex-col gap-0.5 font-mono text-xs">
          {events.map((e, i) => (
            <li key={i} className={cn("grid grid-cols-[5.5rem_1fr] gap-2", e.kind === "error" && "text-destructive", e.kind === "log" && "font-medium")}>
              <span className={cn("text-foreground/70", e.kind === "error" && "text-destructive")}>{LABEL[e.kind]}</span>
              <span className="break-all">{e.text}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
