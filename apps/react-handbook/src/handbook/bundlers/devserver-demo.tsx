"use client";

import { useState } from "react";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Choice } from "@/handbook/jwt/token-view";

// A model of the work each dev-server design does, from the size of the app
// and how much of it the first page needs. Counts, not timings: timings
// depend on the machine, the tool version and the cache.

const SIZES = [
  { value: "300", label: "300 modules" },
  { value: "3000", label: "3,000" },
  { value: "30000", label: "30,000" },
] as const;

const SHARES = [
  { value: "0.1", label: "10%" },
  { value: "0.4", label: "40%" },
  { value: "1", label: "all of it" },
] as const;

const DEPENDENCY_PACKAGES = 40;

type Row = { design: string; tools: string; transformedFirst: string; requests: string; onEdit: string };

function model(modules: number, share: number): Row[] {
  const page = Math.round(modules * share);
  const n = (x: number) => x.toLocaleString("en-US");
  return [
    {
      design: "Bundle first",
      tools: "webpack dev server (CRA)",
      transformedFirst: `${n(modules)}: the whole app, plus every dependency, before the first response`,
      requests: "A few bundle files",
      onEdit: "Re-transform 1 module, rebuild the bundle that contains it, push the update",
    },
    {
      design: "Native ES modules",
      tools: "Vite",
      transformedFirst: `${n(page)}, on request as the browser asks for them (dependencies were pre-bundled once and cached)`,
      requests: `About ${n(page + Math.round(DEPENDENCY_PACKAGES * share))}: one per source module, plus the pre-bundled dependencies`,
      onEdit: "Re-transform 1 module; the browser re-requests just that file",
    },
    {
      design: "Incremental bundling",
      tools: "Turbopack (Next.js)",
      transformedFirst: `${n(page)}: only what the requested route needs, bundled; results are cached per function and on disk`,
      requests: "A few chunk files for that route",
      onEdit: "Recompute 1 module and the chunk it is in, reusing every cached result",
    },
  ];
}

export function DevServerDemo() {
  const [size, setSize] = useState<(typeof SIZES)[number]["value"]>("3000");
  const [share, setShare] = useState<(typeof SHARES)[number]["value"]>("0.4");
  const rows = model(Number(size), Number(share));
  return (
    <div className="flex flex-col gap-3">
      <div className="grid gap-4 sm:grid-cols-2">
        <Choice legend="Source modules in the app" value={size} options={SIZES} onChange={setSize} />
        <Choice legend="Share the first page imports" value={share} options={SHARES} onChange={setShare} />
      </div>
      <ul className="flex flex-col gap-2 md:hidden" aria-label="Dev server designs">
        {rows.map((r) => (
          <li key={r.design} className="rounded-lg border p-3 text-sm">
            <p className="font-medium">
              {r.design} <span className="font-normal text-foreground/75">({r.tools})</span>
            </p>
            <dl className="mt-1 grid gap-1 text-xs">
              <div>
                <dt className="text-muted-foreground">Modules transformed before the first page</dt>
                <dd>{r.transformedFirst}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Requests for the first page</dt>
                <dd>{r.requests}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">One edit</dt>
                <dd>{r.onEdit}</dd>
              </div>
            </dl>
          </li>
        ))}
      </ul>
      <div className="hidden md:block">
        <Table>
          <caption className="sr-only">Work each dev-server design does</caption>
          <TableHeader>
            <TableRow>
              <TableHead scope="col">Design</TableHead>
              <TableHead scope="col">Modules transformed before the first page</TableHead>
              <TableHead scope="col">Requests for the first page</TableHead>
              <TableHead scope="col">One edit</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.design}>
                <TableHead scope="row" className="align-top whitespace-normal">
                  {r.design}
                  <span className="block text-xs font-normal text-foreground/75">{r.tools}</span>
                </TableHead>
                <TableCell className="align-top text-xs whitespace-normal">{r.transformedFirst}</TableCell>
                <TableCell className="align-top text-xs whitespace-normal">{r.requests}</TableCell>
                <TableCell className="align-top text-xs whitespace-normal">{r.onEdit}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <p className="text-xs text-muted-foreground">A model of the work each design does, not a benchmark; it assumes {DEPENDENCY_PACKAGES} dependency packages.</p>
    </div>
  );
}
