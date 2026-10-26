"use client";

import { Gauge } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";

import { formatBytes } from "./sizes";

type Row = { name: string; kind: "JS" | "CSS"; transfer: number; encoded: number; decoded: number; cached: boolean; sized: boolean };

type Result = { rows: Row[] } | { unavailable: string };

const HASHED = /(^|[-.])[0-9a-z_~-]{8,}\.(js|css)$/i;

function readBuildFiles(): Result {
  if (typeof performance === "undefined" || typeof performance.getEntriesByType !== "function") {
    return { unavailable: "This browser doesn't expose Resource Timing, so the page can't list what it loaded." };
  }
  const rows: Row[] = [];
  for (const entry of performance.getEntriesByType("resource") as PerformanceResourceTiming[]) {
    const url = new URL(entry.name);
    if (url.origin !== location.origin || !url.pathname.startsWith("/_next/static/")) continue;
    const kind = url.pathname.endsWith(".css") ? "CSS" : url.pathname.endsWith(".js") ? "JS" : null;
    if (!kind) continue;
    // decodedBodySize is 0 when the browser withholds sizes (it does for some cross-origin or opaque responses).
    const sized = entry.decodedBodySize > 0;
    rows.push({
      name: url.pathname.split("/").pop()!,
      kind,
      transfer: entry.transferSize,
      encoded: entry.encodedBodySize,
      decoded: entry.decodedBodySize,
      cached: sized && entry.transferSize === 0,
      sized,
    });
  }
  if (rows.length === 0) {
    return { unavailable: "No build files are in this page's timing buffer. Reload the page and measure again." };
  }
  return { rows: rows.sort((a, b) => b.decoded - a.decoded) };
}

/** Sum over the files whose sizes the browser exposed; a dash when it exposed none. */
function total(rows: Row[], key: "transfer" | "encoded" | "decoded") {
  const sized = rows.filter((row) => row.sized);
  return sized.length ? formatBytes(sized.reduce((sum, row) => sum + row[key], 0)) : "—";
}

function fromLabel(row: Row) {
  if (!row.sized) return "Size unavailable";
  return row.cached ? "Browser cache" : "Network";
}

export function LoadedDemo() {
  const [result, setResult] = useState<Result | null>(null);

  function handleMeasure() {
    setResult(readBuildFiles());
  }

  const rows = result && "rows" in result ? result.rows : null;
  const hashed = rows ? rows.filter((r) => HASHED.test(r.name)).length : 0;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={handleMeasure}>
          <Gauge aria-hidden />
          {result ? "Measure again" : "List what this page loaded"}
        </Button>
        <p aria-live="polite" className="text-sm">
          {rows
            ? `${rows.length} build files: ${rows.filter((r) => r.kind === "JS").length} scripts, ${rows.filter((r) => r.kind === "CSS").length} stylesheets`
            : result && "unavailable" in result
              ? result.unavailable
              : "Reads the browser's own Resource Timing entries for this page."}
        </p>
      </div>

      {rows ? (
        <>
          <div className="max-h-96 overflow-auto rounded-lg border" tabIndex={0} role="region" aria-label="Build files this page loaded">
            {/* A plain <table>: the shadcn Table adds its own scroll container, which would sit inside this focusable one. */}
            <table className="w-full caption-bottom text-sm">
              <TableHeader>
                <TableRow>
                  <TableHead scope="col">File</TableHead>
                  <TableHead scope="col">Type</TableHead>
                  <TableHead scope="col" className="text-right">
                    Transferred
                  </TableHead>
                  <TableHead scope="col" className="text-right">
                    Compressed body
                  </TableHead>
                  <TableHead scope="col" className="text-right">
                    Decoded
                  </TableHead>
                  <TableHead scope="col">From</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.name}>
                    <TableCell className="max-w-56 truncate font-mono text-xs" title={row.name}>
                      {row.name}
                    </TableCell>
                    <TableCell>{row.kind}</TableCell>
                    <TableCell className="text-right tabular-nums">{row.sized ? formatBytes(row.transfer) : "—"}</TableCell>
                    <TableCell className="text-right tabular-nums">{row.sized ? formatBytes(row.encoded) : "—"}</TableCell>
                    <TableCell className="text-right tabular-nums">{row.sized ? formatBytes(row.decoded) : "—"}</TableCell>
                    <TableCell>{fromLabel(row)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableHead scope="row" colSpan={2}>
                    Total
                  </TableHead>
                  <TableCell className="text-right tabular-nums">{total(rows, "transfer")}</TableCell>
                  <TableCell className="text-right tabular-nums">{total(rows, "encoded")}</TableCell>
                  <TableCell className="text-right tabular-nums">{total(rows, "decoded")}</TableCell>
                  <TableCell />
                </TableRow>
              </TableFooter>
            </table>
          </div>
          <p className="text-xs text-foreground/75">
            {hashed === rows.length
              ? "Every file name carries a content hash, so the server can tell browsers to cache it for a year."
              : `${rows.length - hashed} of ${rows.length} names have no content hash: that's a development server, which never caches long-term.`}{" "}
            Transferred includes headers and is 0 for files served from the browser cache; Decoded is the size after decompression, what the browser parses.
            Reload the page and measure again to watch files come from the cache.
          </p>
        </>
      ) : null}
    </div>
  );
}
