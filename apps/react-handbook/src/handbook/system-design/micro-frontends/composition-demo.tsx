"use client";

import { Check, Minus, X } from "lucide-react";
import { useState } from "react";

import { Choice } from "@/handbook/jwt/token-view";
import { cn } from "@/lib/utils";

import { APPROACHES, ASSUMPTIONS, PROPERTIES, approach, type ApproachId, type Level, type StepKind } from "./composition";
import { ToolTable } from "./tool-table";

const APPROACH_OPTIONS = APPROACHES.map((a) => ({ value: a.id, label: a.name }));

const LEVEL_LABEL: Record<Level, string> = { yes: "Yes", partial: "Partly", no: "No" };

const KIND: Record<StepKind, { label: string; bar: string }> = {
  network: { label: "network", bar: "bg-info/70" },
  server: { label: "server", bar: "bg-primary/70" },
  script: { label: "script", bar: "bg-[color-mix(in_oklch,var(--warning),black_10%)]" },
  data: { label: "data", bar: "bg-foreground/45" },
  render: { label: "render", bar: "bg-success" },
};

/** The longest timeline of all approaches, so bars are comparable between them. */
const SCALE = Math.max(...APPROACHES.map((a) => a.interactive));

export function LevelMark({ level }: { level: Level }) {
  const Icon = level === "yes" ? Check : level === "partial" ? Minus : X;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 font-medium",
        level === "yes" && "text-success",
        level === "partial" && "text-[color-mix(in_oklch,var(--warning),black_35%)] dark:text-warning",
        level === "no" && "text-foreground/75",
      )}
    >
      <Icon aria-hidden className="size-3.5" />
      {LEVEL_LABEL[level]}
    </span>
  );
}

export function CompositionDemo() {
  const [id, setId] = useState<ApproachId>("client");
  const current = approach(id);

  return (
    <div className="flex flex-col gap-5">
      <Choice legend="Compose the product page with" value={id} options={APPROACH_OPTIONS} onChange={setId} />
      <p className="text-sm text-foreground/85">{current.summary}</p>

      <div className="flex flex-col gap-2">
        <p aria-live="polite" className="text-sm">
          Product details on screen after <strong>{current.firstContent} ms</strong>; every piece interactive after <strong>{current.interactive} ms</strong>;{" "}
          {current.kb} kB of JavaScript.
        </p>
        <div role="region" aria-label="Load timeline (scrollable)" tabIndex={0} className="relative overflow-x-auto rounded-lg border outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
          <table className="w-full min-w-[560px] text-xs">
            <caption className="sr-only">Each step of loading the product page with {current.name}, with its start and end time</caption>
            <thead className="text-left text-foreground/75">
              <tr>
                <th scope="col" className="px-3 py-2 font-medium">Step</th>
                <th scope="col" className="w-1/2 px-3 py-2 font-medium">
                  Timeline (0 to {SCALE} ms, the same scale for every approach)
                </th>
              </tr>
            </thead>
            <tbody>
              {current.steps.map((step) => (
                <tr key={step.label} className="border-t">
                  <th scope="row" className="px-3 py-1.5 text-left font-normal">
                    {step.label} <span className="text-foreground/75">({KIND[step.kind].label})</span>
                  </th>
                  <td className="px-3 py-1.5">
                    <div className="relative h-3 rounded-sm bg-muted">
                      <div
                        className={cn("absolute inset-y-0 rounded-sm", KIND[step.kind].bar)}
                        style={{ left: `${(step.start / SCALE) * 100}%`, width: `max(2px, ${((step.end - step.start) / SCALE) * 100}%)` }}
                      />
                      <div aria-hidden className="absolute inset-y-[-3px] w-px bg-foreground" style={{ left: `${(current.firstContent / SCALE) * 100}%` }} />
                    </div>
                    <span className="sr-only">
                      from {step.start} ms to {step.end} ms
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-foreground/75">
          A model, not a measurement. The thin vertical line marks when product details appear. Assumed: {ASSUMPTIONS.rtt} ms round trip to the origin,{" "}
          {ASSUMPTIONS.edgeRtt} ms to the CDN edge, {ASSUMPTIONS.perKb} ms per kB of JavaScript to download and parse, {ASSUMPTIONS.data} ms per data request from
          the browser, {ASSUMPTIONS.render} ms to render or hydrate a piece, and a {ASSUMPTIONS.framework} kB shared framework. Preloading, HTTP caching and streaming
          would shorten every line.
        </p>
      </div>

      <dl className="grid gap-2 sm:grid-cols-2" aria-label={`Properties of ${current.name}`}>
        {PROPERTIES.map((p) => (
          <div key={p.id} className="flex flex-col gap-0.5 rounded-lg border p-3 text-sm">
            <dt className="flex flex-wrap items-center justify-between gap-2 font-medium">
              {p.label}
              <LevelMark level={current.properties[p.id].level} />
            </dt>
            <dd className="text-xs text-foreground/85">{current.properties[p.id].note}</dd>
          </div>
        ))}
      </dl>

      <ToolTable highlight={id} />
    </div>
  );
}
