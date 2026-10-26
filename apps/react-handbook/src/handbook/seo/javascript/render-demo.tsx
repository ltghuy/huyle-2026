"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";

import { FetchError } from "../crawling/fetch-error";
import { FieldSelect } from "../field-select";
import { CompareView } from "./compare-view";
import { getLab, labPath, type LabSlug } from "./labs";
import { useLabRun } from "./use-lab-run";

const CASES: readonly { value: LabSlug; label: string }[] = [
  { value: "server", label: "Rendered on the server" },
  { value: "client", label: "Rendered only in the browser" },
  { value: "client-title", label: "Title set by JavaScript" },
];

const VERDICT: Record<string, string> = {
  server: "Every crawler gets the article and its title from the first HTML. Nothing depends on rendering.",
  client:
    "Crawlers that read only the first HTML get \"Loading…\" and no heading. Google gets the article after rendering, which may wait in a queue. Many AI crawlers never get it.",
  "client-title":
    "The article is in the HTML, but the title and description only exist after JavaScript runs. Google can use them; crawlers that don't render (link previews, many AI crawlers) see \"SEO lab\" and no description.",
};

export function RenderDemo() {
  const [slug, setSlug] = useState<LabSlug>("client");
  const { run, start } = useLabRun();
  const lab = getLab(slug)!;

  function handleRun() {
    void start(slug);
  }

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="w-72 max-w-full">
          <FieldSelect label="Lab page" value={slug} options={CASES} onChange={setSlug} />
        </div>
        <Button onClick={handleRun} disabled={run.state === "running"}>
          {run.state === "running" ? "Fetching and rendering…" : "Fetch and render"}
        </Button>
        <a href={labPath(slug)} target="_blank" rel="noreferrer" className="text-sm text-link underline underline-offset-4">
          Open the lab page
        </a>
      </div>
      <p className="text-sm text-foreground/85">{lab.shows}</p>

      <div aria-live="polite" className="flex min-w-0 flex-col gap-3">
        {run.state === "error" ? <FetchError what={labPath(slug)} message={run.message} onRetry={handleRun} /> : null}
        {run.state === "done" ? (
          <>
            <CompareView
              label="Server HTML and rendered page compared"
              markers={lab.markers}
              columns={[
                { title: "Server HTML", detail: `Status ${run.status}. What every crawler reads first.`, snap: run.html },
                { title: "After rendering", detail: "JavaScript ran, nothing clicked.", snap: run.rendered.before },
              ]}
            />
            {run.rendered.timedOut ? <p className="text-sm text-foreground/75">The frame took longer than 8 seconds to load; this is what it had.</p> : null}
            <p className="rounded-lg bg-muted/40 p-3 text-sm">{VERDICT[slug]}</p>
          </>
        ) : null}
      </div>
      <p className="text-xs text-foreground/75">
        The rendered column comes from loading the page in a hidden frame in your browser. Like Google&apos;s renderer it runs the JavaScript and
        clicks nothing; unlike it, there&apos;s no queue, the viewport is normal, and your own storage and cookies apply.
      </p>
    </div>
  );
}
