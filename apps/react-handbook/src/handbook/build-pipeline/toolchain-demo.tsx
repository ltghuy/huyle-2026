"use client";

import { TriangleAlert } from "lucide-react";
import { useState } from "react";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Choice } from "@/handbook/jwt/token-view";
import { cn } from "@/lib/utils";

import { JOBS, type Slot, TOOLCHAINS, type ToolchainId } from "./toolchains";

const OPTIONS = TOOLCHAINS.map((t) => ({ value: t.id, label: t.name }));

function SlotText({ slot }: { slot: Slot }) {
  return (
    <span className="flex flex-col gap-0.5">
      <span className={cn("font-medium", slot.none && "text-muted-foreground italic")}>{slot.tool}</span>
      {slot.note ? <span className="text-xs text-foreground/75">{slot.note}</span> : null}
    </span>
  );
}

export function ToolchainDemo() {
  const [id, setId] = useState<ToolchainId>("cra");
  const chain = TOOLCHAINS.find((t) => t.id === id)!;

  return (
    <div className="flex flex-col gap-4">
      <Choice legend="Setup" value={id} options={OPTIONS} onChange={setId} />

      <div className="flex flex-col gap-1 text-sm">
        <p>
          <code className="font-mono text-[0.8125rem]">{chain.command}</code>: {chain.summary}
        </p>
        {chain.deprecated ? (
          <p className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/5 p-2 text-xs">
            <TriangleAlert aria-hidden className="mt-0.5 size-4 shrink-0 text-destructive" />
            <span>
              <strong>Deprecated.</strong> {chain.deprecated}
            </span>
          </p>
        ) : null}
      </div>

      {/* Phones: one card per job. */}
      <ul className="flex flex-col gap-2 sm:hidden" aria-label={`Who does each job in ${chain.name}`}>
        {JOBS.map((job) => (
          <li key={job.id} className="rounded-lg border p-3 text-sm">
            <p className="font-medium">{job.title}</p>
            <dl className="mt-2 grid gap-2">
              <div>
                <dt className="text-xs text-muted-foreground">Development</dt>
                <dd>
                  <SlotText slot={chain.jobs[job.id].dev} />
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Production build</dt>
                <dd>
                  <SlotText slot={chain.jobs[job.id].prod} />
                </dd>
              </div>
            </dl>
          </li>
        ))}
      </ul>

      {/* Wider screens: a table. */}
      <div className="hidden sm:block">
        <Table>
          <caption className="sr-only">Who does each job in {chain.name}</caption>
          <TableHeader>
            <TableRow>
              <TableHead scope="col">Job</TableHead>
              <TableHead scope="col">Development</TableHead>
              <TableHead scope="col">Production build</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {JOBS.map((job) => (
              <TableRow key={job.id}>
                <TableHead scope="row" className="align-top font-medium whitespace-normal">
                  {job.title}
                </TableHead>
                <TableCell className="align-top whitespace-normal">
                  <SlotText slot={chain.jobs[job.id].dev} />
                </TableCell>
                <TableCell className="align-top whitespace-normal">
                  <SlotText slot={chain.jobs[job.id].prod} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <p className="text-xs text-muted-foreground">Italic entries are jobs the setup deliberately leaves undone in that mode.</p>
    </div>
  );
}
