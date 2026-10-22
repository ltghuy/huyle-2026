"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { SITE_URL } from "@/lib/site";

import { type Inspection, inspectPage } from "../inspect";

const PATH = "/seo/crawling-indexing";
const CANONICAL = `${SITE_URL}${PATH}`;

const VARIANTS = [
  { id: "plain", label: "As linked", path: PATH },
  { id: "slash", label: "With a trailing slash", path: `${PATH}/` },
  { id: "utm", label: "With a tracking parameter", path: `${PATH}?utm_source=newsletter` },
  { id: "case", label: "In different letter case", path: "/SEO/Crawling-Indexing" },
] as const;

type Row = { id: string; label: string; path: string; data?: Inspection; error?: string };

function reading(row: Row) {
  const d = row.data!;
  if (d.status === 404) return "A 404 with noindex: nothing to index, so no duplicate. Paths in Next.js are case-sensitive.";
  if (d.redirectedTo) return `Redirected to ${d.redirectedTo}, so crawlers index the target only. Next.js removes trailing slashes with a 308.`;
  if (d.canonical === CANONICAL && row.path !== PATH) return "Served as a copy, but its canonical points to the clean URL, so the copies fold into it.";
  if (d.canonical === CANONICAL) return "The canonical names this URL itself: a self-referencing canonical.";
  return `The canonical is ${d.canonical ?? "missing"}, which doesn't match the clean URL.`;
}

export function CanonicalCheck() {
  const [rows, setRows] = useState<Row[] | null>(null);

  async function handleCheck() {
    setRows(VARIANTS.map((v) => ({ ...v })));
    const done = await Promise.all(
      VARIANTS.map(async (v): Promise<Row> => {
        try {
          return { ...v, data: await inspectPage(v.path, new AbortController().signal) };
        } catch (error) {
          return { ...v, error: error instanceof Error ? error.message : String(error) };
        }
      }),
    );
    setRows(done);
  }

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-foreground/85">
          Request this page four ways and read what comes back. The canonical URL every version should name is <code className="font-mono text-xs break-all">{CANONICAL}</code>.
        </p>
        <Button onClick={handleCheck}>{rows ? "Request again" : "Request the four URLs"}</Button>
      </div>
      {rows ? (
        <ul aria-live="polite" className="grid min-w-0 gap-2 md:grid-cols-2">
          {rows.map((row) => (
            <li key={row.id} className="flex min-w-0 flex-col gap-1 rounded-lg border p-3 text-sm">
              <span className="font-medium">{row.label}</span>
              <code className="font-mono text-xs break-all text-foreground/80">{row.path}</code>
              {row.error ? (
                <span className="text-destructive">Couldn&apos;t fetch: {row.error}</span>
              ) : row.data ? (
                <>
                  <span>
                    Status {row.data.status}
                    {row.data.redirectedTo ? ` after a redirect to ${row.data.redirectedTo}` : ""}; canonical{" "}
                    <code className="font-mono text-xs break-all">{row.data.canonical ?? "none"}</code>
                  </span>
                  <span className="text-foreground/85">{reading(row)}</span>
                </>
              ) : (
                <span className="text-foreground/75">Fetching…</span>
              )}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
