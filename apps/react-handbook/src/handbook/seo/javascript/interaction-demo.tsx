"use client";

import { Button } from "@/components/ui/button";

import { FetchError } from "../crawling/fetch-error";
import { CompareView } from "./compare-view";
import { getLab, labPath } from "./labs";
import { useLabRun } from "./use-lab-run";

const LAB = getLab("interaction")!;

export function InteractionDemo() {
  const { run, start } = useLabRun();

  function handleRun() {
    void start("interaction", true);
  }

  const seen = run.state === "done" ? LAB.markers.filter((m) => run.rendered.before.markers.includes(m.id)) : [];
  const missed = run.state === "done" ? LAB.markers.filter((m) => !run.rendered.before.markers.includes(m.id)) : [];

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={handleRun} disabled={run.state === "running"}>
          {run.state === "running" ? "Rendering, then clicking and scrolling…" : "Fetch, render, then interact"}
        </Button>
        <a href={labPath("interaction")} target="_blank" rel="noreferrer" className="text-sm text-link underline underline-offset-4">
          Open the lab page
        </a>
      </div>
      <div aria-live="polite" className="flex min-w-0 flex-col gap-3">
        {run.state === "error" ? <FetchError what={labPath("interaction")} message={run.message} onRetry={handleRun} /> : null}
        {run.state === "done" ? (
          <>
            <CompareView
              label="Interaction lab compared before and after a click and a scroll"
              markers={LAB.markers}
              columns={[
                { title: "Server HTML", detail: "Crawlers that don't render.", snap: run.html },
                { title: "After rendering", detail: "What Google indexes: no clicks, no scrolling.", snap: run.rendered.before },
                ...(run.rendered.after ? [{ title: "After a click and a scroll", detail: "What a person sees. No crawler does this.", snap: run.rendered.after }] : []),
              ]}
            />
            <p className="rounded-lg bg-muted/40 p-3 text-sm">
              <span className="font-medium">Indexed after rendering:</span> {seen.map((m) => m.label).join("; ")}.{" "}
              <span className="font-medium">Missed:</span> {missed.map((m) => m.label).join("; ")}. That content exists, but only after something no
              crawler does.
            </p>
          </>
        ) : null}
      </div>
    </div>
  );
}
