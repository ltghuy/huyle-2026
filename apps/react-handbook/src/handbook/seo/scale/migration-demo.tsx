"use client";

import { useEffect, useId, useState } from "react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Verdict } from "@/handbook/ui";

import { FetchError } from "../crawling/fetch-error";
import { listOf, parseMap, resolve, SAMPLE } from "./redirects";

// This site's own move: practices went from /practices to /react-practices.
const LIVE = ["/practices", "/practices/toast-notifications"] as const;

type LiveResult = { from: string; to: string; status: number; redirected: boolean };

type Live = { state: "loading" } | { state: "done"; results: LiveResult[] } | { state: "error"; message: string };

async function checkLive(): Promise<LiveResult[]> {
  return Promise.all(
    LIVE.map(async (from) => {
      const res = await fetch(from, { method: "HEAD", cache: "no-store" });
      return { from, to: new URL(res.url).pathname, status: res.status, redirected: res.redirected };
    }),
  );
}

function Field({ id, label, value, rows, onChange }: { id: string; label: string; value: string; rows: number; onChange: (value: string) => void }) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <Label htmlFor={id} className="text-xs">
        {label}
      </Label>
      <Textarea id={id} value={value} onChange={(e) => onChange(e.target.value)} rows={rows} spellCheck={false} wrap="off" className="font-mono text-xs leading-relaxed" />
    </div>
  );
}

export function MigrationDemo() {
  const [old, setOld] = useState<string>(SAMPLE.old);
  const [map, setMap] = useState<string>(SAMPLE.map);
  const [newSite, setNewSite] = useState<string>(SAMPLE.newSite);
  const [live, setLive] = useState<Live>({ state: "loading" });
  const [attempt, setAttempt] = useState(0);
  const baseId = useId();

  useEffect(() => {
    let active = true;
    checkLive()
      .then((results) => active && setLive({ state: "done", results }))
      .catch((e: unknown) => active && setLive({ state: "error", message: e instanceof Error ? e.message : String(e) }));
    return () => {
      active = false;
    };
  }, [attempt]);

  const { rules, errors } = parseMap(map);
  const pages = new Set(listOf(newSite));
  const urls = [...new Set([...listOf(old), ...rules.keys()])];
  const results = urls.map((url) => resolve(url, rules, pages));
  const problems = results.filter((r) => r.findings.some((f) => !f.ok)).length;

  function handleSample() {
    setOld(SAMPLE.old);
    setMap(SAMPLE.map);
    setNewSite(SAMPLE.newSite);
  }

  function handleRetry() {
    setLive({ state: "loading" });
    setAttempt((n) => n + 1);
  }

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div className="grid min-w-0 gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_minmax(0,1fr)]">
        <Field id={`${baseId}-old`} label="Old URLs (from the sitemap and logs)" value={old} rows={8} onChange={setOld} />
        <Field id={`${baseId}-map`} label="Redirect map" value={map} rows={8} onChange={setMap} />
        <Field id={`${baseId}-new`} label="Pages on the new site" value={newSite} rows={8} onChange={setNewSite} />
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button size="sm" variant="outline" onClick={handleSample}>
          Sample migration
        </Button>
        {errors.map((e) => (
          <p key={e.line} className="text-xs text-foreground/85">
            Redirect map line {e.line} skipped. {e.text}
          </p>
        ))}
      </div>

      <div aria-live="polite" className="flex min-w-0 flex-col gap-2">
        <p className="text-sm">
          <Verdict pass={problems === 0}>{problems === 0 ? "Every old URL is handled" : `${problems} of ${results.length} old URLs need work`}</Verdict>
        </p>
        <Table aria-label="Where each old URL ends up">
          <TableHeader>
            <TableRow>
              <TableHead>Old URL</TableHead>
              <TableHead>Path</TableHead>
              <TableHead>Findings</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {results.map((r) => (
              <TableRow key={r.url}>
                <TableCell className="align-top font-mono text-xs">{r.url}</TableCell>
                <TableCell className="align-top font-mono text-xs whitespace-normal">
                  {r.hops.length === 0 ? "none" : r.hops.map((h) => `${h.code} → ${h.to ?? "gone"}`).join(", ")}
                </TableCell>
                <TableCell className="min-w-56 align-top text-xs whitespace-normal">
                  <div className="flex flex-col gap-0.5">
                    {r.findings.map((f) => (
                      <Verdict key={f.text} pass={f.ok}>
                        {f.text}
                      </Verdict>
                    ))}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex min-w-0 flex-col gap-2 rounded-lg border p-3 text-sm">
        <p className="text-xs font-medium text-foreground/75">This site&apos;s own move, checked now</p>
        {live.state === "loading" ? <p className="text-xs">Following the redirects…</p> : null}
        {live.state === "error" ? <FetchError what="the old practice URLs" message={live.message} onRetry={handleRetry} /> : null}
        {live.state === "done"
          ? live.results.map((r) => (
              <p key={r.from} className="text-xs">
                <Verdict pass={r.redirected && r.status === 200}>
                  <span className="font-mono">{r.from}</span>
                </Verdict>{" "}
                {r.redirected ? `redirects to ${r.to}, which answers ${r.status}.` : `didn't redirect (status ${r.status}).`}
              </p>
            ))
          : null}
        <p className="text-xs text-foreground/75">
          Browsers hide the redirect&apos;s status code; the site&apos;s end-to-end SEO test checks that it&apos;s a permanent 308 with one hop.
        </p>
      </div>
    </div>
  );
}
