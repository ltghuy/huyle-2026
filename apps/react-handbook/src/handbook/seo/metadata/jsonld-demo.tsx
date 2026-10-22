"use client";

import { Check, X } from "lucide-react";
import { useEffect, useState } from "react";

import { CodeBlock } from "@/handbook/e2e/code-block";

import { FetchError } from "../crawling/fetch-error";
import { FieldSelect } from "../field-select";
import { fetchDocument, PAGE_OPTIONS } from "./pages";
import { type Check as CheckItem, objectsIn, validate, type Validation } from "./rules";

type Block = { raw: string; obj: Record<string, unknown> | null; validation: Validation | null; visible: CheckItem[] };

type Load = { state: "loading" } | { state: "error"; message: string } | { state: "done"; blocks: Block[] };

function visibleChecks(obj: Record<string, unknown>, doc: Document): CheckItem[] {
  const checks: CheckItem[] = [];
  const h1 = doc.querySelector("h1")?.textContent?.trim() ?? "";
  const time = doc.querySelector("header time")?.getAttribute("datetime") ?? null;
  if (typeof obj.headline === "string") checks.push({ ok: obj.headline === h1, text: `headline ${obj.headline === h1 ? "matches" : "differs from"} the visible h1 "${h1}"` });
  if (typeof obj.dateModified === "string" && time) {
    const same = obj.dateModified.slice(0, 10) === time;
    checks.push({ ok: same, text: `dateModified ${obj.dateModified.slice(0, 10)} ${same ? "matches" : "differs from"} the date shown on the page (${time})` });
  }
  if (obj["@type"] === "BreadcrumbList" && Array.isArray(obj.itemListElement)) {
    const shown = [...doc.querySelectorAll('nav[aria-label="Breadcrumb"] li')].map((li) => li.textContent?.trim() ?? "");
    const names = obj.itemListElement.map((i) => String((i as Record<string, unknown>).name ?? ""));
    const same = shown.join("|") === names.join("|");
    checks.push({ ok: same, text: `Crumbs ${same ? "match" : "differ from"} the visible breadcrumbs (${shown.join(" › ")})` });
  }
  return checks;
}

function CheckList({ items }: { items: CheckItem[] }) {
  return (
    <ul className="flex flex-col gap-1 text-sm">
      {items.map((c, i) => (
        <li key={i} className="inline-flex items-start gap-1.5">
          {c.ok ? <Check aria-hidden className="mt-0.5 size-4 shrink-0 text-success" /> : <X aria-hidden className="mt-0.5 size-4 shrink-0 text-destructive" />}
          <span className="min-w-0 wrap-break-word">{c.text}</span>
        </li>
      ))}
    </ul>
  );
}

export function JsonLdDemo() {
  const [path, setPath] = useState(PAGE_OPTIONS[0].value);
  const [attempt, setAttempt] = useState(0);
  const [load, setLoad] = useState<Load>({ state: "loading" });

  useEffect(() => {
    let live = true;
    fetchDocument(path)
      .then(({ doc }) => {
        if (!live) return;
        const blocks = [...doc.querySelectorAll('script[type="application/ld+json"]')].flatMap((s): Block[] => {
          const raw = s.textContent ?? "";
          try {
            return objectsIn(JSON.parse(raw)).map((obj) => ({ raw: JSON.stringify(obj, null, 2), obj, validation: validate(obj), visible: visibleChecks(obj, doc) }));
          } catch {
            return [{ raw, obj: null, validation: null, visible: [] }];
          }
        });
        setLoad({ state: "done", blocks });
      })
      .catch((e: unknown) => live && setLoad({ state: "error", message: e instanceof Error ? e.message : String(e) }));
    return () => {
      live = false;
    };
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
      <div aria-live="polite" className="flex min-w-0 flex-col gap-4">
        {load.state === "loading" ? <p className="rounded-lg border border-dashed p-3 text-sm text-foreground/75">Fetching {path}…</p> : null}
        {load.state === "error" ? <FetchError what={path} message={load.message} onRetry={handleRetry} /> : null}
        {load.state === "done" && load.blocks.length === 0 ? <p className="rounded-lg border p-3 text-sm">This page sends no JSON-LD.</p> : null}
        {load.state === "done"
          ? load.blocks.map((b, i) => (
              <div key={i} className="grid min-w-0 gap-3 lg:grid-cols-2">
                <CodeBlock path={`JSON-LD block ${i + 1}${b.validation ? `: ${b.validation.type}` : ""}`} code={b.raw} lang="json" />
                <div className="flex min-w-0 flex-col gap-2 rounded-lg border p-3">
                  {b.validation ? (
                    <>
                      <p className="text-sm font-medium">Against Google&apos;s documented properties</p>
                      <CheckList items={b.validation.checks} />
                      {b.validation.note ? <p className="text-xs text-foreground/80">{b.validation.note}</p> : null}
                      {b.visible.length > 0 ? (
                        <>
                          <p className="mt-1 text-sm font-medium">Against the visible page</p>
                          <CheckList items={b.visible} />
                        </>
                      ) : null}
                    </>
                  ) : (
                    <p className="text-sm text-destructive">This block isn&apos;t valid JSON, so search engines ignore it.</p>
                  )}
                </div>
              </div>
            ))
          : null}
      </div>
    </div>
  );
}
