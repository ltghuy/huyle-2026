"use client";

import { Check, X } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";

import { FetchError } from "../crawling/fetch-error";
import { inspectPage } from "../inspect";
import { labPath } from "./labs";
import { type NavElement, renderInFrame, type Snapshot, snapshotHtml } from "./render-frame";

type Verdict = { crawlable: boolean; why: string };

function judge(nav: NavElement): Verdict {
  if (nav.tag !== "a") return { crawlable: false, why: `A <${nav.tag}> has no URL to follow; the router.push() runs only on a click.` };
  if (nav.href === null) return { crawlable: false, why: "An <a> without href isn't a link to a crawler." };
  if (nav.href.startsWith("javascript:")) return { crawlable: false, why: "A javascript: URL isn't an address. React 19 even swaps it for one that throws an error." };
  if (nav.href.startsWith("#")) return { crawlable: false, why: "A fragment stays on the same URL, so there's no new page to crawl." };
  if (nav.rel?.includes("nofollow")) return { crawlable: true, why: "A real link, marked as a hint not to follow." };
  return { crawlable: true, why: "A real <a href> with a URL." };
}

type SoftCase = { path: string; label: string; status: number; text: boolean; noindex: boolean };

type Result = { navs: { nav: NavElement; inHtml: boolean }[]; soft: SoftCase[] };

async function softCase(path: string, label: string): Promise<SoftCase> {
  const [page, rendered] = await Promise.all([inspectPage(path, new AbortController().signal), renderInFrame(path)]);
  const snap = rendered.before;
  return {
    path,
    label,
    status: page.status,
    text: snap.markers.includes("not-found") || /not be found|not found/i.test(snap.title ?? "") || snap.h1.some((h) => /not found/i.test(h)),
    noindex: /noindex/.test(`${snap.robots ?? ""} ${page.robots ?? ""}`),
  };
}

function softVerdict(c: SoftCase) {
  if (c.status === 404) return { ok: true, text: "A real 404: the URL is dropped, and Next.js adds noindex too." };
  if (c.noindex) return { ok: true, text: "Status 200, but the error view adds noindex, so it stays out of results." };
  return { ok: false, text: "A soft 404: status 200, a \"not found\" message and nothing saying not to index it." };
}

export function LinksDemo() {
  const [result, setResult] = useState<Result | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleRun() {
    setRunning(true);
    setError(null);
    try {
      const [htmlText, rendered] = await Promise.all([fetch(labPath("links"), { cache: "no-store" }).then((r) => r.text()), renderInFrame(labPath("links"))]);
      const html: Snapshot = snapshotHtml(htmlText);
      const soft = await Promise.all([
        softCase(labPath("soft-404"), "Not found, with a 200"),
        softCase(labPath("soft-404-noindex"), "Not found, with noindex"),
        softCase("/seo-lab/discontinued-kettle", "A real missing page"),
      ]);
      setResult({ navs: rendered.before.navs.map((nav) => ({ nav, inHtml: html.navs.some((n) => n.label === nav.label) })), soft });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div>
        <Button onClick={handleRun} disabled={running}>
          {running ? "Checking…" : result ? "Check again" : "Check the lab pages"}
        </Button>
      </div>
      {error ? <FetchError what="the lab pages" message={error} onRetry={handleRun} /> : null}
      {result ? (
        <div aria-live="polite" className="flex min-w-0 flex-col gap-4">
          <div className="flex min-w-0 flex-col gap-2">
            <h4 className="text-sm font-medium">Navigation on the links lab page, after rendering</h4>
            <ul className="flex min-w-0 flex-col gap-1.5">
              {result.navs.map(({ nav, inHtml }) => {
                const v = judge(nav);
                return (
                  <li key={nav.label} className="grid min-w-0 gap-1 rounded-lg border p-2.5 text-sm sm:grid-cols-[12rem_minmax(0,1fr)]">
                    <span className="inline-flex items-start gap-1.5 font-medium">
                      {v.crawlable ? <Check aria-hidden className="mt-0.5 size-4 shrink-0 text-success" /> : <X aria-hidden className="mt-0.5 size-4 shrink-0 text-destructive" />}
                      {nav.label}
                    </span>
                    <span className="min-w-0 text-foreground/85">
                      <span className="font-medium">{v.crawlable ? "Followed." : "Not followed."}</span> {v.why}
                      {nav.href ? (
                        <>
                          {" "}
                          <code className="font-mono text-xs break-all">href=&quot;{nav.href}&quot;</code>
                        </>
                      ) : null}
                      {inHtml ? null : <span className="block text-xs text-foreground/75">Only in the rendered page, not the server HTML.</span>}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
          <div className="flex min-w-0 flex-col gap-2">
            <h4 className="text-sm font-medium">Missing products</h4>
            <ul className="grid min-w-0 gap-2 md:grid-cols-3">
              {result.soft.map((c) => {
                const v = softVerdict(c);
                return (
                  <li key={c.path} className="flex min-w-0 flex-col gap-1 rounded-lg border p-3 text-sm">
                    <span className="inline-flex items-start gap-1.5 font-medium">
                      {v.ok ? <Check aria-hidden className="mt-0.5 size-4 shrink-0 text-success" /> : <X aria-hidden className="mt-0.5 size-4 shrink-0 text-destructive" />}
                      {c.label}
                    </span>
                    <code className="font-mono text-xs break-all text-foreground/80">{c.path}</code>
                    <span>
                      Status {c.status}
                      {c.status === 200 ? `, ${c.text ? "says not found" : "no error text"}` : ""}, {c.noindex ? "noindex" : "no noindex"}
                    </span>
                    <span className="text-foreground/85">{v.text}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      ) : null}
    </div>
  );
}
