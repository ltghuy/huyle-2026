"use client";

import { Check, Minus, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { NAV_FOLDERS } from "@/components/playground/nav-folders";
import { Button } from "@/components/ui/button";
import { getTopicPage, topicHref } from "@/practices/catalog";

import { FieldSelect } from "./field-select";
import { ADDED_BY, type Inspection, inspectPage } from "./inspect";

const PAGE_OPTIONS = [
  { value: "/seo/how-search-works", label: "This page" },
  { value: "/", label: "Home" },
  ...NAV_FOLDERS.flatMap((f) => [{ value: f.href, label: f.title }, ...f.items.map((i) => ({ value: i.href, label: `${f.title}: ${i.title}` }))]).filter(
    (o) => o.value !== "/seo/how-search-works",
  ),
  { value: "/practices", label: "/practices (an old address)" },
  { value: "/seo/no-such-page", label: "/seo/no-such-page (doesn't exist)" },
];

type Load = { state: "loading" } | { state: "done"; data: Inspection } | { state: "error"; message: string };

type Row = { field: keyof Inspection; label: string; value: React.ReactNode; present: boolean; fallback?: string };

function rowsFor(d: Inspection): Row[] {
  return [
    { field: "title", label: "Title", value: d.title, present: d.title !== null },
    { field: "description", label: "Meta description", value: d.description, present: d.description !== null },
    { field: "canonical", label: "Canonical URL", value: d.canonical, present: d.canonical !== null },
    {
      field: "robots",
      label: "Robots rules",
      value: [d.robots && `meta: ${d.robots}`, d.xRobotsTag && `header: ${d.xRobotsTag}`].filter(Boolean).join(" · "),
      present: d.robots !== null || d.xRobotsTag !== null,
      fallback: "Not set, so the defaults apply: index, follow.",
    },
    { field: "h1", label: "h1", value: d.h1.join(" · "), present: d.h1.length > 0 },
    { field: "ogTitle", label: "Social card title", value: d.ogTitle, present: d.ogTitle !== null },
    { field: "ogImage", label: "Social card image", value: d.ogImage, present: d.ogImage !== null },
    { field: "jsonLd", label: "Structured data", value: `${d.jsonLd} JSON-LD block${d.jsonLd === 1 ? "" : "s"}`, present: d.jsonLd > 0 },
  ];
}

function Missing({ row }: { row: Row }) {
  if (row.fallback) {
    return (
      <span className="inline-flex items-start gap-1.5 text-foreground/80">
        <Minus aria-hidden className="mt-0.5 size-4 shrink-0" />
        {row.fallback}
      </span>
    );
  }
  const slug = ADDED_BY[row.field];
  return (
    <span className="inline-flex items-start gap-1.5">
      <X aria-hidden className="mt-0.5 size-4 shrink-0 text-destructive" />
      <span>
        <span className="font-medium text-destructive">Missing.</span>{" "}
        {slug ? (
          <>
            Added by{" "}
            <Link href={topicHref(slug)} className="rounded-sm font-medium underline underline-offset-4 outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
              {getTopicPage(slug).title}
            </Link>
            .
          </>
        ) : null}
      </span>
    </span>
  );
}

export function CrawlerView() {
  const [path, setPath] = useState(PAGE_OPTIONS[0].value);
  const [attempt, setAttempt] = useState(0);
  const [load, setLoad] = useState<Load>({ state: "loading" });

  useEffect(() => {
    const controller = new AbortController();
    inspectPage(path, controller.signal)
      .then((data) => setLoad({ state: "done", data }))
      .catch((error: unknown) => {
        if (!controller.signal.aborted) setLoad({ state: "error", message: error instanceof Error ? error.message : String(error) });
      });
    return () => controller.abort();
  }, [path, attempt]);

  function handlePath(next: string) {
    setLoad({ state: "loading" });
    setPath(next);
  }

  function handleRetry() {
    setLoad({ state: "loading" });
    setAttempt((n) => n + 1);
  }

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div className="max-w-md">
        <FieldSelect label="Page of this site" value={path} options={PAGE_OPTIONS} onChange={handlePath} />
      </div>

      <div aria-live="polite" aria-busy={load.state === "loading"} className="min-w-0">
        {load.state === "loading" ? (
          <p className="rounded-lg border border-dashed p-3 text-sm text-foreground/75">Fetching {path}…</p>
        ) : load.state === "error" ? (
          <div className="flex flex-wrap items-center gap-3 rounded-lg border border-destructive/40 p-3 text-sm">
            <p>
              Couldn&apos;t fetch {path}: {load.message}
            </p>
            <Button size="sm" variant="outline" onClick={handleRetry}>
              Try again
            </Button>
          </div>
        ) : (
          <InspectionView path={path} data={load.data} />
        )}
      </div>
      <p className="text-xs text-foreground/75">
        This fetches the real page from this site and reads the HTML as text, the way a crawler&apos;s first fetch does. None of the page&apos;s
        scripts run.
      </p>
    </div>
  );
}

function InspectionView({ path, data }: { path: string; data: Inspection }) {
  const ok = data.status >= 200 && data.status < 300;
  return (
    <div className="flex min-w-0 flex-col gap-3">
      <div className="grid min-w-0 gap-3 sm:grid-cols-3">
        <p className="rounded-lg border p-3 text-sm">
          <span className="block font-mono text-2xl font-medium tabular-nums">{data.status}</span>
          {data.redirectedTo ? `after a redirect from ${path} to ${data.redirectedTo}` : ok ? "status" : "status: not a page to index"}
        </p>
        <p className="rounded-lg border p-3 text-sm">
          <span className="block font-mono text-2xl font-medium tabular-nums">{data.words.toLocaleString("en")}</span>
          words of text before any script runs
        </p>
        <p className="rounded-lg border p-3 text-sm">
          <span className="block font-mono text-2xl font-medium tabular-nums">{data.internalLinks}</span>
          links to this site ({data.externalLinks} to other sites)
        </p>
      </div>

      <dl className="grid min-w-0 gap-x-4 gap-y-2 rounded-lg border p-3 text-sm sm:grid-cols-[10rem_minmax(0,1fr)]">
        {rowsFor(data).map((row) => (
          <div key={row.field} className="contents">
            <dt className="font-medium">{row.label}</dt>
            <dd className="min-w-0 wrap-break-word">
              {row.present ? (
                <span className="inline-flex items-start gap-1.5">
                  <Check aria-hidden className="mt-0.5 size-4 shrink-0 text-success" />
                  <span className="min-w-0">{row.value}</span>
                </span>
              ) : (
                <Missing row={row} />
              )}
            </dd>
          </div>
        ))}
      </dl>

      <details className="rounded-lg border p-3 text-sm">
        <summary className="cursor-pointer rounded-sm font-medium outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
          Headings in the HTML <span className="font-normal text-foreground/75 tabular-nums">{data.headings.length}</span>
        </summary>
        {data.headings.length === 0 ? (
          <p className="mt-2 text-foreground/75">No h2 or h3 headings.</p>
        ) : (
          <ul className="mt-2 flex flex-col gap-1">
            {data.headings.map((h, i) => (
              <li key={i} className={h.level === 3 ? "pl-4 text-foreground/85" : undefined}>
                <span className="mr-2 font-mono text-xs text-foreground/75">h{h.level}</span>
                {h.text}
              </li>
            ))}
          </ul>
        )}
      </details>
    </div>
  );
}
