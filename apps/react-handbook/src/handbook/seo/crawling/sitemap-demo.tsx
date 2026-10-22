"use client";

import { Check, X } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

import { inspectPage } from "../inspect";
import { FetchError } from "./fetch-error";
import { useText } from "./use-text";

type Entry = { loc: string; lastmod: string | null };

type Audit = { loc: string; status: number | null; redirected: boolean; noindex: boolean; canonicalOk: boolean; error?: string };

const PARALLEL = 4;

function parseSitemap(xml: string): Entry[] {
  const doc = new DOMParser().parseFromString(xml, "application/xml");
  return [...doc.getElementsByTagName("url")].map((url) => ({
    loc: url.getElementsByTagName("loc")[0]?.textContent?.trim() ?? "",
    lastmod: url.getElementsByTagName("lastmod")[0]?.textContent?.trim() ?? null,
  }));
}

function problems(a: Audit) {
  if (a.error) return [`fetch failed: ${a.error}`];
  const out: string[] = [];
  if (a.status !== 200) out.push(`status ${a.status}`);
  if (a.redirected) out.push("redirects");
  if (a.noindex) out.push("noindex");
  if (!a.canonicalOk) out.push("canonical points elsewhere");
  return out;
}

async function auditOne(loc: string): Promise<Audit> {
  const url = new URL(loc);
  try {
    const page = await inspectPage(url.pathname + url.search, new AbortController().signal);
    return {
      loc,
      status: page.status,
      redirected: page.redirectedTo !== null,
      noindex: /noindex|none/.test(`${page.robots ?? ""} ${page.xRobotsTag ?? ""}`),
      canonicalOk: page.canonical === loc,
    };
  } catch (error) {
    return { loc, status: null, redirected: false, noindex: false, canonicalOk: false, error: error instanceof Error ? error.message : String(error) };
  }
}

export function SitemapDemo() {
  const { load, retry } = useText("/sitemap.xml");
  const [results, setResults] = useState<Audit[]>([]);
  const [running, setRunning] = useState(false);
  const entries = load.state === "done" ? parseSitemap(load.text) : [];

  async function handleAudit() {
    setRunning(true);
    setResults([]);
    const queue = entries.map((e) => e.loc);
    async function worker() {
      for (let loc = queue.shift(); loc !== undefined; loc = queue.shift()) {
        const result = await auditOne(loc);
        setResults((current) => [...current, result]);
      }
    }
    await Promise.all(Array.from({ length: PARALLEL }, worker));
    setRunning(false);
  }

  if (load.state === "loading") return <p className="rounded-lg border border-dashed p-3 text-sm text-foreground/75">Fetching /sitemap.xml…</p>;
  if (load.state === "error") return <FetchError what="/sitemap.xml" message={load.message} onRetry={retry} />;

  const done = results.length === entries.length && entries.length > 0 && !running;
  const bad = results.filter((r) => problems(r).length > 0);
  const byLoc = new Map(results.map((r) => [r.loc, r]));

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm">
          <span className="font-mono text-2xl font-medium tabular-nums">{entries.length}</span> URLs in{" "}
          <code className="font-mono text-xs">/sitemap.xml</code> (status {load.status})
        </p>
        <Button onClick={handleAudit} disabled={running || entries.length === 0}>
          {running ? "Checking…" : done ? "Check again" : "Check every URL"}
        </Button>
      </div>

      <div aria-live="polite" className="flex min-w-0 flex-col gap-2">
        {running || done ? <Progress value={(results.length / Math.max(entries.length, 1)) * 100} aria-label={`${results.length} of ${entries.length} URLs checked`} /> : null}
        {done ? (
          <p className="rounded-lg bg-muted/40 p-3 text-sm">
            {bad.length === 0
              ? `All ${entries.length} URLs answer 200, aren't noindex, don't redirect, and name themselves as canonical.`
              : `${bad.length} of ${entries.length} URLs have problems. A sitemap should list only canonical, indexable URLs.`}
          </p>
        ) : null}
      </div>

      <div tabIndex={0} role="region" aria-label="Sitemap URLs" className="max-h-80 min-w-0 overflow-auto rounded-lg border outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
        <table className="w-full text-left text-xs">
          <thead className="sticky top-0 bg-background">
            <tr className="border-b">
              <th className="px-3 py-2 font-medium">URL</th>
              <th className="px-3 py-2 font-medium">lastmod</th>
              <th className="px-3 py-2 font-medium">Check</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e) => {
              const audit = byLoc.get(e.loc);
              const issues = audit ? problems(audit) : [];
              return (
                <tr key={e.loc} className="border-b last:border-b-0">
                  <td className="px-3 py-1.5 font-mono break-all">{e.loc.replace(/^https:\/\/[^/]+/, "") || "/"}</td>
                  <td className="px-3 py-1.5 font-mono whitespace-nowrap tabular-nums">{e.lastmod ?? "none"}</td>
                  <td className="px-3 py-1.5 whitespace-nowrap">
                    {!audit ? (
                      <span className="text-foreground/70">Not checked</span>
                    ) : issues.length === 0 ? (
                      <span className="inline-flex items-center gap-1 font-medium text-success">
                        <Check aria-hidden className="size-3.5" />
                        OK
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 font-medium text-destructive">
                        <X aria-hidden className="size-3.5" />
                        {issues.join(", ")}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-foreground/75">
        The check fetches each listed page from this site, {PARALLEL} at a time, and reads its status, robots rules and canonical link.
      </p>
    </div>
  );
}
