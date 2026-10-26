"use client";

import { RotateCcw, TriangleAlert } from "lucide-react";
import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import type { CacheLogEntry, CacheRule } from "@/server/handbook/http-echo.schema";

const RULES: { id: CacheRule; title: string; header: string; detail: string }[] = [
  { id: "no-store", title: "Never store", header: "Cache-Control: no-store", detail: "Every request downloads it again." },
  { id: "max-age", title: "Fresh for 5 minutes", header: "Cache-Control: private, max-age=300", detail: "Reused without asking until it is 5 minutes old." },
  { id: "etag", title: "Always check, reuse if unchanged", header: "Cache-Control: no-cache + ETag", detail: "Asks with If-None-Match; 304 means “keep your copy”." },
];

type Row = { id: number; status: number; transferred: number | null; verdict: "cache" | "revalidated" | "full"; serverCount: number };

let nextRowId = 0;

function newRun() {
  return `run-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/** One fetch with the browser's normal caching, then the server's own log of what it received. */
async function fetchOnce(rule: CacheRule, run: string, previousCount: number): Promise<Row> {
  const url = `/api/handbook/cache?rule=${rule}&run=${run}`;
  const response = await fetch(url);
  await response.text();
  await new Promise((resolve) => setTimeout(resolve, 50)); // let the timing entry land
  const entry = (performance.getEntriesByName(new URL(url, location.href).href) as PerformanceResourceTiming[]).at(-1);
  const logResponse = await fetch(`/api/handbook/cache/log?run=${run}`);
  const { data } = (await logResponse.json()) as { data: { entries: CacheLogEntry[] } };
  const mine = data.entries.filter((e) => e.rule === rule);
  const reached = mine.length > previousCount;
  return {
    id: nextRowId++,
    status: response.status,
    transferred: entry ? entry.transferSize : null,
    verdict: !reached ? "cache" : mine.at(-1)!.status === 304 ? "revalidated" : "full",
    serverCount: mine.length,
  };
}

const VERDICT_TEXT: Record<Row["verdict"], string> = {
  cache: "From the browser cache: the server wasn't contacted",
  revalidated: "Revalidated: the server answered 304 Not Modified, the cached body was reused",
  full: "Downloaded in full from the server",
};

export function CacheDemo() {
  const runRef = useRef<string | null>(null);
  const [rows, setRows] = useState<Record<CacheRule, Row[]>>({ "no-store": [], "max-age": [], etag: [] });
  const [busy, setBusy] = useState<CacheRule | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleFetch(rule: CacheRule) {
    runRef.current ??= newRun();
    setBusy(rule);
    setError(null);
    try {
      const previous = rows[rule].at(-1)?.serverCount ?? 0;
      const row = await fetchOnce(rule, runRef.current, previous);
      setRows((current) => ({ ...current, [rule]: [...current[rule], row] }));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }

  function handleReset() {
    runRef.current = newRun();
    setRows({ "no-store": [], "max-age": [], etag: [] });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-foreground/85">Fetch each resource two or three times. These are real requests to this site.</p>
        <Button variant="outline" size="sm" onClick={handleReset}>
          <RotateCcw aria-hidden />
          Start over with new addresses
        </Button>
      </div>
      {error ? (
        <p role="alert" className="flex items-center gap-2 rounded-lg border border-destructive/40 p-3 text-sm text-destructive">
          <TriangleAlert aria-hidden className="size-4" />
          The request failed: {error}
        </p>
      ) : null}
      <div className="grid gap-3 lg:grid-cols-3">
        {RULES.map((rule) => (
          <div key={rule.id} className="flex min-w-0 flex-col gap-2 rounded-lg border p-3">
            <h4 className="text-sm font-medium">{rule.title}</h4>
            <code className="font-mono text-xs break-all text-foreground/75">{rule.header}</code>
            <p className="text-xs text-foreground/75">{rule.detail}</p>
            <Button size="sm" className="w-fit" disabled={busy !== null} onClick={() => handleFetch(rule.id)}>
              {busy === rule.id ? "Fetching…" : "Fetch"}
            </Button>
            <ol aria-live="polite" className="flex flex-col gap-1.5 text-xs">
              {rows[rule.id].map((row, i) => (
                <li key={row.id} className="rounded-md border p-2">
                  <p className="font-medium">
                    Fetch {i + 1}: {VERDICT_TEXT[row.verdict]}
                  </p>
                  <p className="font-mono text-foreground/75">
                    script saw {row.status} · {row.transferred === null ? "size n/a" : `${row.transferred} B over the network`} · server has seen {row.serverCount}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        ))}
      </div>
    </div>
  );
}
