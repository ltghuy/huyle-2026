"use client";

import { Check, X } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

import { FetchError } from "../crawling/fetch-error";
import { localPath, parseSitemap, runPool } from "../crawling/sitemap";
import { inspectPage } from "../inspect";

// Rough guides only: Google cuts titles and descriptions by pixel width.
const TITLE_MAX = 60;
const DESCRIPTION_MAX = 160;
const PARALLEL = 4;

type Row = { loc: string; title: string | null; description: string | null; canonical: string | null; h1: number; error?: string };

async function readRow(loc: string): Promise<Row> {
  try {
    const page = await inspectPage(localPath(loc), new AbortController().signal);
    return { loc, title: page.title, description: page.description, canonical: page.canonical, h1: page.h1.length };
  } catch (error) {
    return { loc, title: null, description: null, canonical: null, h1: 0, error: error instanceof Error ? error.message : String(error) };
  }
}

function issues(row: Row, titleCount: Map<string, number>, descCount: Map<string, number>) {
  if (row.error) return [`fetch failed: ${row.error}`];
  const out: string[] = [];
  if (!row.title) out.push("no title");
  else if ((titleCount.get(row.title) ?? 0) > 1) out.push("duplicate title");
  if (!row.description) out.push("no description");
  else if ((descCount.get(row.description) ?? 0) > 1) out.push("duplicate description");
  if (row.canonical !== row.loc) out.push("canonical doesn't match");
  if (row.h1 !== 1) out.push(`${row.h1} h1 elements`);
  return out;
}

function count(values: (string | null)[]) {
  const map = new Map<string, number>();
  for (const v of values) if (v) map.set(v, (map.get(v) ?? 0) + 1);
  return map;
}

export function MetadataAudit() {
  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleRun() {
    setRunning(true);
    setError(null);
    setRows([]);
    try {
      const xml = await fetch("/sitemap.xml", { cache: "no-store" }).then((r) => r.text());
      const locs = parseSitemap(xml).map((e) => e.loc);
      setTotal(locs.length);
      await runPool(locs, PARALLEL, readRow, (row) => setRows((current) => [...current, row]));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setRunning(false);
    }
  }

  const titleCount = count(rows.map((r) => r.title));
  const descCount = count(rows.map((r) => r.description));
  const done = !running && rows.length > 0 && rows.length === total;
  const withIssues = rows.filter((r) => issues(r, titleCount, descCount).length > 0);
  const long = rows.filter((r) => (r.title?.length ?? 0) > TITLE_MAX || (r.description?.length ?? 0) > DESCRIPTION_MAX).length;

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div>
        <Button onClick={handleRun} disabled={running}>
          {running ? "Checking…" : done ? "Check again" : "Check every page in the sitemap"}
        </Button>
      </div>
      {error ? <FetchError what="/sitemap.xml" message={error} onRetry={handleRun} /> : null}
      <div aria-live="polite" className="flex min-w-0 flex-col gap-2">
        {running || done ? <Progress value={(rows.length / Math.max(total, 1)) * 100} aria-label={`${rows.length} of ${total} pages checked`} /> : null}
        {done ? (
          <p className="rounded-lg bg-muted/40 p-3 text-sm">
            {withIssues.length === 0
              ? `No problems: all ${total} pages have one title and one h1, a description, and a canonical that matches, with no duplicates.`
              : `${withIssues.length} of ${total} pages have problems.`}{" "}
            {long > 0 ? `${long} have a title over ${TITLE_MAX} or a description over ${DESCRIPTION_MAX} characters, which may be cut off in results.` : null}
          </p>
        ) : null}
      </div>
      {rows.length > 0 ? (
        <div tabIndex={0} role="region" aria-label="Metadata per page" className="max-h-96 min-w-0 overflow-auto rounded-lg border outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
          <table className="w-full min-w-[40rem] text-left text-xs">
            <thead className="sticky top-0 bg-background">
              <tr className="border-b">
                <th className="px-3 py-2 font-medium">Page</th>
                <th className="px-3 py-2 font-medium">Title</th>
                <th className="px-3 py-2 font-medium">Description</th>
                <th className="px-3 py-2 font-medium">Check</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const found = issues(row, titleCount, descCount);
                return (
                  <tr key={row.loc} className="border-b align-top last:border-b-0">
                    <td className="px-3 py-1.5 font-mono break-all">{localPath(row.loc)}</td>
                    <td className="px-3 py-1.5">
                      {row.title} <span className="text-foreground/75 tabular-nums">({row.title?.length ?? 0})</span>
                    </td>
                    <td className="px-3 py-1.5 text-foreground/85">
                      <span className="tabular-nums">{row.description?.length ?? 0} characters</span>
                      {(row.description?.length ?? 0) > DESCRIPTION_MAX ? <span className="block text-foreground/75">may be cut off</span> : null}
                    </td>
                    <td className="px-3 py-1.5 whitespace-nowrap">
                      {found.length === 0 ? (
                        <span className="inline-flex items-center gap-1 font-medium text-success">
                          <Check aria-hidden className="size-3.5" />
                          OK
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 font-medium text-destructive">
                          <X aria-hidden className="size-3.5" />
                          {found.join(", ")}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : null}
      <p className="text-xs text-foreground/75">
        Lengths are rough guides: search results cut titles and descriptions by pixel width, not characters. A long description isn&apos;t an error.
      </p>
    </div>
  );
}
