"use client";

import { useId, useState } from "react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Verdict } from "@/handbook/ui";

import { FetchError } from "../crawling/fetch-error";
import { localPath, parseSitemap, runPool } from "../crawling/sitemap";
import { useText } from "../crawling/use-text";
import { checkLlms, SAMPLES, type LlmsLink } from "./llms-check";

type LinkResult = { url: string; inSitemap: boolean; status: number | null };

type LinkRun = { state: "idle" } | { state: "running"; done: number; total: number } | { state: "done"; results: LinkResult[]; missing: string[] };

async function probe(link: LlmsLink, sitemap: Set<string>): Promise<LinkResult> {
  const inSitemap = sitemap.has(link.url);
  try {
    const res = await fetch(localPath(link.url), { method: "HEAD", cache: "no-store" });
    return { url: link.url, inSitemap, status: res.status };
  } catch {
    return { url: link.url, inSitemap, status: null };
  }
}

export function LlmsDemo() {
  const { load, retry } = useText("/llms.txt");
  const sitemap = useText("/sitemap.xml");
  const [text, setText] = useState<string | null>(null);
  const [run, setRun] = useState<LinkRun>({ state: "idle" });
  const textId = useId();

  const isLive = text === null;
  const value = text ?? (load.state === "done" ? load.text : "");
  const report = checkLlms(value);
  const links = report.sections.flatMap((s) => s.links);
  const errors = report.problems.filter((p) => p.level === "error").length;

  function handleEdit(next: string) {
    setText(next);
    setRun({ state: "idle" });
  }

  function handleLive() {
    setText(null);
    setRun({ state: "idle" });
  }

  async function handleCheckLinks() {
    if (sitemap.load.state !== "done") return;
    const locs = new Set(parseSitemap(sitemap.load.text).map((e) => e.loc));
    const results: LinkResult[] = [];
    setRun({ state: "running", done: 0, total: links.length });
    await runPool(links, 4, (link) => probe(link, locs), (result) => {
      results.push(result);
      setRun({ state: "running", done: results.length, total: links.length });
    });
    const listed = new Set(links.map((l) => l.url));
    // The home page is the file itself (its H1 and summary), so it isn't a link.
    const missing = [...locs].filter((loc) => !listed.has(loc) && new URL(loc).pathname !== "/");
    setRun({ state: "done", results, missing });
  }

  const broken = run.state === "done" ? run.results.filter((r) => r.status !== 200 || !r.inSitemap) : [];

  return (
    <div className="flex min-w-0 flex-col gap-4">
      {load.state === "error" ? <FetchError what="/llms.txt" message={load.message} onRetry={retry} /> : null}
      <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="flex min-w-0 flex-col gap-2">
          <Label htmlFor={textId}>{isLive ? "This site's llms.txt, fetched now" : "llms.txt to check"}</Label>
          <Textarea
            id={textId}
            value={load.state === "loading" && isLive ? "Fetching /llms.txt…" : value}
            onChange={(e) => handleEdit(e.target.value)}
            rows={14}
            spellCheck={false}
            className="font-mono text-xs leading-relaxed"
          />
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" disabled={load.state !== "done"} onClick={handleLive}>
              This site&apos;s file
            </Button>
            <Button size="sm" variant="outline" onClick={() => handleEdit(SAMPLES.minimal)}>
              Smallest valid file
            </Button>
            <Button size="sm" variant="outline" onClick={() => handleEdit(SAMPLES.broken)}>
              A file with mistakes
            </Button>
          </div>
        </div>

        <div aria-live="polite" className="flex min-w-0 flex-col gap-3 text-sm">
          <p>
            <Verdict pass={errors === 0}>{errors === 0 ? "Follows the format" : `${errors} error${errors === 1 ? "" : "s"}`}</Verdict>
          </p>
          {report.problems.length > 0 ? (
            <ul className="flex flex-col gap-1 text-xs">
              {report.problems.map((p, i) => (
                <li key={i}>
                  <span className="font-medium">{p.level === "error" ? "Error" : "Note"}, line {p.line}:</span> {p.text}
                </li>
              ))}
            </ul>
          ) : null}
          {report.title !== null ? (
            <div className="flex flex-col gap-1 rounded-lg bg-muted/40 p-3 text-xs">
              <p className="font-medium">{report.title}</p>
              {report.summary ? <p className="text-foreground/80">{report.summary}</p> : null}
              <ul className="mt-1 flex flex-col gap-0.5">
                {report.sections.map((s) => (
                  <li key={s.line}>
                    {s.name}: {s.links.length} link{s.links.length === 1 ? "" : "s"}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {isLive && load.state === "done" ? (
            <div className="flex flex-col gap-2">
              <Button size="sm" variant="outline" className="self-start" disabled={sitemap.load.state !== "done" || run.state === "running"} onClick={handleCheckLinks}>
                Check every link against the sitemap
              </Button>
              {sitemap.load.state === "error" ? <FetchError what="/sitemap.xml" message={sitemap.load.message} onRetry={sitemap.retry} /> : null}
              {run.state === "running" ? (
                <p className="text-xs">
                  Checked {run.done} of {run.total}…
                </p>
              ) : null}
              {run.state === "done" ? (
                <div className="flex flex-col gap-1 text-xs">
                  <Verdict pass={broken.length === 0}>
                    {broken.length === 0 ? `All ${run.results.length} links load and are in the sitemap` : `${broken.length} link${broken.length === 1 ? "" : "s"} with a problem`}
                  </Verdict>
                  {broken.map((r) => (
                    <p key={r.url}>
                      {r.url}: {r.status === null ? "didn't load" : `status ${r.status}`}
                      {r.inSitemap ? "" : ", not in the sitemap"}
                    </p>
                  ))}
                  <Verdict pass={run.missing.length === 0}>
                    {run.missing.length === 0 ? "Every sitemap page is listed" : `${run.missing.length} sitemap page${run.missing.length === 1 ? "" : "s"} missing`}
                  </Verdict>
                  {run.missing.map((loc) => (
                    <p key={loc}>{loc}</p>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
      <p className="text-xs text-foreground/75">
        Checks follow the proposal at llmstxt.org (version 2). No AI search engine documents reading the file, so passing these checks says
        nothing about how a page ranks or gets cited.
      </p>
    </div>
  );
}
