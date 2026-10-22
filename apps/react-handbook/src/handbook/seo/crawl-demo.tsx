"use client";

import { useState } from "react";

import { Toggle } from "@/handbook/ui";

import { ALL_NODES, crawl, type CrawlOptions, type Found, LINK_GROUPS, LINK_STYLES, type LinkGroup, type LinkStyle } from "./crawl";
import { FieldSelect } from "./field-select";

const STYLE_OPTIONS = LINK_STYLES.map((s) => ({ value: s.value, label: s.label }));

const NO_ORPHAN = "none";
const ORPHAN_OPTIONS = [
  { value: NO_ORPHAN, label: "No page is orphaned" },
  ...ALL_NODES.filter((n) => n.href !== "/").map((n) => ({ value: n.href, label: n.title })),
];

const ALL_LINKS: CrawlOptions["styles"] = { home: "link", section: "link", sidebar: "link" };

function groupByDepth(found: Found[]) {
  const groups = new Map<Found["depth"], Found[]>();
  for (const f of found) groups.set(f.depth, [...(groups.get(f.depth) ?? []), f]);
  return [...groups.entries()].sort(([a], [b]) => (a === "sitemap" ? 1 : b === "sitemap" ? -1 : a - b));
}

export function CrawlDemo() {
  const [styles, setStyles] = useState(ALL_LINKS);
  const [orphan, setOrphan] = useState(NO_ORPHAN);
  const [sitemap, setSitemap] = useState(false);
  const result = crawl({ styles, orphan: orphan === NO_ORPHAN ? null : orphan, sitemap });
  const share = Math.round((result.found.length / result.total) * 100);

  function handleStyle(group: LinkGroup, style: LinkStyle) {
    setStyles((current) => ({ ...current, [group]: style }));
  }

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div className="grid min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {LINK_GROUPS.map((g) => (
          <FieldSelect key={g.id} label={g.label} value={styles[g.id]} options={STYLE_OPTIONS} onChange={(style) => handleStyle(g.id, style)} />
        ))}
        <FieldSelect label="Orphaned page (nothing links to it)" value={orphan} options={ORPHAN_OPTIONS} onChange={setOrphan} />
      </div>
      <Toggle checked={sitemap} onCheckedChange={setSitemap} title="Publish a sitemap" detail="It lists every page, so the crawler can reach pages no link points to." />

      <div aria-live="polite" className="flex min-w-0 flex-col gap-3">
        <p className="rounded-lg border p-3 text-sm">
          <span className="block font-mono text-2xl font-medium tabular-nums">
            {result.found.length} of {result.total}
          </span>
          pages found ({share}%), {result.byLinks} of them by following links from the home page.
        </p>
        <div className="flex min-w-0 flex-col gap-2">
          {groupByDepth(result.found).map(([depth, pages]) => (
            <details key={String(depth)} className="rounded-lg border p-3 text-sm" open={depth !== 0 && pages.length <= 12}>
              <summary className="cursor-pointer rounded-sm font-medium outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
                {depth === "sitemap" ? "Found only through the sitemap" : depth === 0 ? "Start: the home page" : `${depth} ${depth === 1 ? "click" : "clicks"} from home`}
                <span className="ml-2 font-normal text-foreground/75 tabular-nums">
                  {pages.length} {pages.length === 1 ? "page" : "pages"}
                </span>
              </summary>
              <ul className="mt-2 flex flex-wrap gap-1.5">
                {pages.map((p) => (
                  <li key={p.href} className="rounded-md bg-muted/60 px-2 py-0.5 text-xs">
                    {p.title}
                  </li>
                ))}
              </ul>
            </details>
          ))}
          {result.missing.length > 0 ? (
            <details className="rounded-lg border border-dashed p-3 text-sm" open={result.missing.length <= 12}>
              <summary className="cursor-pointer rounded-sm font-medium outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
                Never found
                <span className="ml-2 font-normal text-foreground/75 tabular-nums">
                  {result.missing.length} {result.missing.length === 1 ? "page" : "pages"}
                </span>
              </summary>
              <ul className="mt-2 flex flex-wrap gap-1.5">
                {result.missing.map((p) => (
                  <li key={p.href} className="rounded-md border border-dashed px-2 py-0.5 text-xs text-foreground/75">
                    {p.title}
                  </li>
                ))}
              </ul>
            </details>
          ) : null}
        </div>
      </div>

      <div className="text-xs text-foreground/75">
        <p className="font-medium text-foreground/85">Simplified model. It assumes:</p>
        <ul className="mt-1 flex list-disc flex-col gap-0.5 pl-4">
          <li>The pages are this site&apos;s real page list; the links are the home cards, the section cards and the sidebar, not links inside the text.</li>
          {LINK_STYLES.map((s) => (
            <li key={s.value}>
              <code className="font-mono">{s.label}</code>: {s.detail}
            </li>
          ))}
          <li>Every page found is fetched; a real crawler also schedules and limits how much it fetches.</li>
        </ul>
      </div>
    </div>
  );
}
