"use client";

import { Check, Minus, X } from "lucide-react";

import { cn } from "@/lib/utils";

import type { Marker } from "./labs";
import type { Snapshot } from "./render-frame";

export type Column = { title: string; detail: string; snap: Snapshot };

function Cell({ present, children }: { present: boolean; children?: React.ReactNode }) {
  return (
    <span className="inline-flex min-w-0 items-start gap-1.5">
      {present ? <Check aria-hidden className="mt-0.5 size-4 shrink-0 text-success" /> : <X aria-hidden className="mt-0.5 size-4 shrink-0 text-destructive" />}
      <span className={cn("min-w-0 wrap-break-word", !present && "text-foreground/75")}>{children ?? (present ? "Present" : "Missing")}</span>
    </span>
  );
}

/** Snapshots of one page side by side: server HTML, rendered, after interaction. */
export function CompareView({ label, columns, markers }: { label: string; columns: Column[]; markers: readonly Marker[] }) {
  const rows: { label: string; render: (s: Snapshot) => React.ReactNode }[] = [
    { label: "Title", render: (s) => <Cell present={s.title !== null}>{s.title}</Cell> },
    { label: "Description", render: (s) => <Cell present={s.description !== null}>{s.description}</Cell> },
    { label: "h1", render: (s) => <Cell present={s.h1.length > 0}>{s.h1.join(" · ") || undefined}</Cell> },
    { label: "Robots meta", render: (s) => (s.robots ? <span>{s.robots}</span> : <span className="inline-flex gap-1.5 text-foreground/75"><Minus aria-hidden className="mt-0.5 size-4 shrink-0" />None</span>) },
    { label: "Words of text", render: (s) => <span className="font-mono tabular-nums">{s.words}</span> },
    { label: "Links", render: (s) => <span className="font-mono tabular-nums">{s.internalLinks}</span> },
    ...markers.map((m) => ({ label: m.label, render: (s: Snapshot) => <Cell present={s.markers.includes(m.id)} /> })),
  ];

  return (
    <div tabIndex={0} role="region" aria-label={label} className="min-w-0 overflow-x-auto rounded-lg border outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
      <table className="w-full min-w-[32rem] text-left text-sm">
        <thead>
          <tr className="border-b">
            <th className="w-40 px-3 py-2 font-medium">
              <span className="sr-only">Field</span>
            </th>
            {columns.map((c) => (
              <th key={c.title} className="px-3 py-2 align-top font-medium">
                {c.title}
                <span className="block text-xs font-normal text-foreground/75">{c.detail}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.label} className="border-b last:border-b-0">
              <th scope="row" className="px-3 py-2 align-top text-xs font-medium">
                {row.label}
              </th>
              {columns.map((c) => (
                <td key={c.title} className="px-3 py-2 align-top">
                  {row.render(c.snap)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
