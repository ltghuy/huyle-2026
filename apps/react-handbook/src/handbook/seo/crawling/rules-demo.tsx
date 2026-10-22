"use client";

import { Check, Minus } from "lucide-react";
import { useId, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CodeBlock } from "@/handbook/e2e/code-block";
import { Toggle } from "@/handbook/ui";

import { FieldSelect } from "../field-select";
import { type Inspection, inspectPage } from "../inspect";
import { effects, EMPTY_RULES, type ImagePreview, nextMetadata, ruleTokens, type RuleSet, warnings } from "./robots-rules";

const FLAGS: readonly { key: keyof RuleSet; title: string; detail: string }[] = [
  { key: "noindex", title: "noindex", detail: "Keep the page out of results." },
  { key: "nofollow", title: "nofollow", detail: "Don't follow the page's links." },
  { key: "nosnippet", title: "nosnippet", detail: "No text snippet or video preview." },
  { key: "noimageindex", title: "noimageindex", detail: "Don't index the page's images." },
  { key: "indexifembedded", title: "indexifembedded", detail: "Index it when embedded in an iframe, despite noindex." },
  { key: "noarchive", title: "noarchive", detail: "An old rule, still seen on many sites." },
];

const PREVIEW_OPTIONS: readonly { value: ImagePreview; label: string }[] = [
  { value: "default", label: "Not set" },
  { value: "none", label: "none" },
  { value: "standard", label: "standard" },
  { value: "large", label: "large" },
];

const SITE_CHECKS = [
  { path: "/seo/crawling-indexing", label: "This page" },
  { path: "/seo-lab/server", label: "An SEO lab page" },
  { path: "/api/health", label: "An API route" },
  { path: "/seo/no-such-page", label: "A missing page" },
];

type SiteRow = { path: string; label: string; data?: Inspection; error?: string };

function source(row: SiteRow) {
  const d = row.data!;
  if (d.xRobotsTag) return "Header from next.config headers() for /api/* and /seo-lab/*.";
  if (d.status === 404) return "Next.js adds noindex to every 404 page.";
  if (d.robots) return "robots in the page's generateMetadata.";
  return "Nothing set, so index, follow applies.";
}

export function RulesDemo() {
  const [rules, setRules] = useState(EMPTY_RULES);
  const [site, setSite] = useState<SiteRow[] | null>(null);
  const snippetId = useId();
  const dateId = useId();
  const tokens = ruleTokens(rules);
  const content = tokens.length > 0 ? tokens.join(", ") : "all";

  function handleFlag(key: keyof RuleSet, on: boolean) {
    setRules((current) => ({ ...current, [key]: on }));
  }

  function handleSnippet(event: React.ChangeEvent<HTMLInputElement>) {
    setRules((current) => ({ ...current, maxSnippet: event.target.value }));
  }

  function handlePreview(maxImagePreview: ImagePreview) {
    setRules((current) => ({ ...current, maxImagePreview }));
  }

  function handleDate(event: React.ChangeEvent<HTMLInputElement>) {
    setRules((current) => ({ ...current, unavailableAfter: event.target.value }));
  }

  async function handleCheckSite() {
    setSite(SITE_CHECKS.map((c) => ({ ...c })));
    const rows = await Promise.all(
      SITE_CHECKS.map(async (c): Promise<SiteRow> => {
        try {
          return { ...c, data: await inspectPage(c.path, new AbortController().signal) };
        } catch (error) {
          return { ...c, error: error instanceof Error ? error.message : String(error) };
        }
      }),
    );
    setSite(rows);
  }

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div className="grid min-w-0 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {FLAGS.map((f) => (
          <Toggle key={f.key} checked={rules[f.key] as boolean} onCheckedChange={(on) => handleFlag(f.key, on)} title={<code className="font-mono">{f.title}</code>} detail={f.detail} />
        ))}
      </div>
      <div className="grid min-w-0 gap-3 sm:grid-cols-3">
        <div className="flex min-w-0 flex-col gap-1.5">
          <Label htmlFor={snippetId} className="text-xs">
            max-snippet (characters, 0 none, -1 no limit)
          </Label>
          <Input id={snippetId} inputMode="numeric" value={rules.maxSnippet} onChange={handleSnippet} className="font-mono text-xs" />
        </div>
        <FieldSelect label="max-image-preview" value={rules.maxImagePreview} options={PREVIEW_OPTIONS} onChange={handlePreview} />
        <div className="flex min-w-0 flex-col gap-1.5">
          <Label htmlFor={dateId} className="text-xs">
            unavailable_after
          </Label>
          <Input id={dateId} type="date" value={rules.unavailableAfter} onChange={handleDate} className="text-xs" />
        </div>
      </div>

      <div aria-live="polite" className="grid min-w-0 gap-4 lg:grid-cols-2">
        <div className="flex min-w-0 flex-col gap-3">
          <CodeBlock path="In the HTML <head>" code={`<meta name="robots" content="${content}">`} lang="html" />
          <CodeBlock path="As a response header (any file type)" code={`X-Robots-Tag: ${content}`} lang="text" />
          <CodeBlock path="In a Next.js page or layout" code={nextMetadata(rules)} lang="ts" />
        </div>
        <div className="flex min-w-0 flex-col gap-2">
          <dl className="grid gap-x-3 gap-y-1.5 rounded-lg border p-3 text-sm sm:grid-cols-[10rem_minmax(0,1fr)]">
            {effects(rules).map((e) => (
              <div key={e.label} className="contents">
                <dt className="font-medium">{e.label}</dt>
                <dd className="inline-flex items-start gap-1.5">
                  {e.ok ? <Check aria-hidden className="mt-0.5 size-4 shrink-0 text-success" /> : <Minus aria-hidden className="mt-0.5 size-4 shrink-0" />}
                  {e.value}
                </dd>
              </div>
            ))}
          </dl>
          {warnings(rules).map((w) => (
            <p key={w} className="rounded-lg bg-muted/40 p-2.5 text-sm">
              <span className="font-medium">Note: </span>
              {w}
            </p>
          ))}
        </div>
      </div>

      <div className="flex min-w-0 flex-col gap-2 border-t pt-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-medium">What this site sends</p>
          <Button size="sm" variant="outline" onClick={handleCheckSite}>
            {site ? "Check again" : "Check this site"}
          </Button>
        </div>
        {site ? (
          <ul aria-live="polite" className="grid min-w-0 gap-2 sm:grid-cols-2">
            {site.map((row) => (
              <li key={row.path} className="flex min-w-0 flex-col gap-1 rounded-lg border p-3 text-sm">
                <span className="font-medium">{row.label}</span>
                <code className="font-mono text-xs break-all text-foreground/80">{row.path}</code>
                {row.error ? (
                  <span className="text-destructive">Couldn&apos;t fetch: {row.error}</span>
                ) : row.data ? (
                  <>
                    <span>
                      Status {row.data.status}
                      {row.data.robots ? `, meta robots "${row.data.robots}"` : ""}
                      {row.data.xRobotsTag ? `, X-Robots-Tag "${row.data.xRobotsTag}"` : ""}
                      {!row.data.robots && !row.data.xRobotsTag ? ", no robots rules" : ""}
                    </span>
                    <span className="text-xs text-foreground/75">{source(row)}</span>
                  </>
                ) : (
                  <span className="text-foreground/75">Fetching…</span>
                )}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  );
}
