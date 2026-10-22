"use client";

import { Check, Minus } from "lucide-react";
import { useId, useState } from "react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Verdict } from "@/handbook/ui";

import { checkCluster, links, parseCluster, SAMPLES } from "./hreflang";

const SAMPLE_BUTTONS: { key: keyof typeof SAMPLES; label: string }[] = [
  { key: "valid", label: "A valid cluster" },
  { key: "oneWay", label: "A missing return link" },
  { key: "noSelf", label: "No self-reference" },
  { key: "badCodes", label: "Wrong codes" },
];

const short = (url: string) => url.replace(/^https?:\/\//, "");

export function HreflangDemo() {
  const [text, setText] = useState<string>(SAMPLES.oneWay);
  const textId = useId();

  const { pages, findings } = parseCluster(text);
  const { cluster, reports } = checkCluster(pages);
  const problemCount = cluster.filter((c) => !c.startsWith("No x-default")).length + reports.reduce((n, r) => n + r.problems.length, 0);

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="flex min-w-0 flex-col gap-2">
          <Label htmlFor={textId}>Pages and the alternates each one sends</Label>
          <Textarea id={textId} value={text} onChange={(e) => setText(e.target.value)} rows={14} spellCheck={false} wrap="off" className="font-mono text-xs leading-relaxed" />
          <p className="text-xs text-foreground/75">One page per line (URL, then its code); its alternates below it, indented (code, then URL).</p>
          <div className="flex flex-wrap gap-2">
            {SAMPLE_BUTTONS.map((s) => (
              <Button key={s.key} size="sm" variant="outline" onClick={() => setText(SAMPLES[s.key])}>
                {s.label}
              </Button>
            ))}
          </div>
        </div>

        <div aria-live="polite" className="flex min-w-0 flex-col gap-3 text-sm">
          <p>
            <Verdict pass={problemCount === 0 && pages.length >= 2}>
              {pages.length < 2 ? "Not a cluster yet" : problemCount === 0 ? "Every pair links both ways" : `${problemCount} problem${problemCount === 1 ? "" : "s"}`}
            </Verdict>
          </p>
          {[...findings.map((f) => `Line ${f.line}: ${f.text}`), ...cluster].map((t) => (
            <p key={t} className="text-xs text-foreground/85">
              {t}
            </p>
          ))}
          {reports.map((r) => (
            <div key={r.page.line} className="flex flex-col gap-1">
              <p className="text-xs font-medium">
                <span className="font-mono">{short(r.page.url)}</span> ({r.page.code})
              </p>
              {r.problems.length === 0 ? (
                <p className="text-xs">
                  <Verdict pass>No problems</Verdict>
                </p>
              ) : (
                <ul className="flex list-disc flex-col gap-0.5 pl-4 text-xs text-foreground/85">
                  {r.problems.map((p) => (
                    <li key={p}>{p}</li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      </div>

      {pages.length >= 2 ? (
        <div className="relative overflow-x-auto" role="region" aria-label="Which page lists which" tabIndex={0}>
          <table className="text-left text-xs">
            <caption className="mb-1.5 text-left text-xs font-medium text-foreground/75">Rows list columns as alternates</caption>
            <thead>
              <tr className="border-b">
                <th scope="col" className="py-1.5 pr-3 font-medium">
                  Page
                </th>
                {pages.map((p) => (
                  <th key={p.line} scope="col" className="px-2 py-1.5 font-mono font-medium">
                    {p.code}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pages.map((row) => (
                <tr key={row.line} className="border-b last:border-0">
                  <th scope="row" className="py-1.5 pr-3 font-mono font-normal">
                    {short(row.url)}
                  </th>
                  {pages.map((col) => (
                    <td key={col.line} className="px-2 py-1.5 text-center">
                      {links(row, col) ? <Check aria-label="lists it" className="mx-auto size-4 text-success" /> : <Minus aria-label="doesn't list it" className="mx-auto size-4 text-destructive" />}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
      <p className="text-xs text-foreground/75">
        Checks follow Google&apos;s documentation on localized versions. The same rules apply whether the links are in the HTML head, an HTTP header or
        the sitemap.
      </p>
    </div>
  );
}
