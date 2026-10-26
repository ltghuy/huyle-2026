"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { deliver, FAST_DELIVERY, SLOW_DELIVERY, type DeliveryOptions, type PhaseId } from "./html-delivery";

const OPTIONS: { key: keyof DeliveryOptions; title: string; text: string }[] = [
  { key: "cdn", title: "Serve through a CDN", text: "Connect to an edge server near the visitor." },
  { key: "edgeCache", title: "Cache the HTML at the edge", text: "Cache-Control lets the CDN answer without the origin." },
  { key: "brotli", title: "Compress with Brotli", text: "Content-Encoding: br, about 7× smaller HTML." },
  { key: "noRedirect", title: "Remove the redirect", text: "Link straight to https://www…" },
];

const PHASE_CLASS: Record<PhaseId, string> = {
  dns: "bg-chart-1",
  connect: "bg-chart-2",
  redirect: "bg-chart-3",
  server: "bg-chart-4",
  download: "bg-chart-5",
};

const same = (a: DeliveryOptions, b: DeliveryOptions) => OPTIONS.every(({ key }) => a[key] === b[key]);

function gain(options: DeliveryOptions, key: keyof DeliveryOptions) {
  const on = deliver({ ...options, [key]: true });
  const off = deliver({ ...options, [key]: false });
  if (on.done === off.done) return key === "edgeCache" && !options.cdn ? "needs a CDN first" : "no gain here";
  return off.ttfb > on.ttfb ? `TTFB −${off.ttfb - on.ttfb} ms` : `download −${off.done - on.done} ms`;
}

export function HtmlDeliveryDemo() {
  const [options, setOptions] = useState<DeliveryOptions>(SLOW_DELIVERY);
  const result = deliver(options);
  const baseline = deliver(SLOW_DELIVERY);
  const preset = same(options, SLOW_DELIVERY) ? "Far away, no CDN" : same(options, FAST_DELIVERY) ? "All on" : "Custom";
  const total = baseline.done;

  function handleToggle(key: keyof DeliveryOptions, on: boolean) {
    setOptions((current) => ({ ...current, [key]: on }));
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-sm font-medium">
          A visitor 200 ms away from your server <span className="font-normal text-foreground/75">· {preset}</span>
        </p>
        <div className="ml-auto flex gap-2">
          <Button variant="outline" size="sm" aria-pressed={preset === "Far away, no CDN"} onClick={() => setOptions(SLOW_DELIVERY)}>
            All off
          </Button>
          <Button variant="outline" size="sm" aria-pressed={preset === "All on"} onClick={() => setOptions(FAST_DELIVERY)}>
            All on
          </Button>
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {OPTIONS.map(({ key, title, text }) => {
          const disabled = key === "edgeCache" && !options.cdn;
          return (
            <label
              key={key}
              className={cn(
                "flex cursor-pointer gap-2 rounded-lg border p-3 text-sm has-focus-visible:ring-3 has-focus-visible:ring-ring/50",
                options[key] && !disabled ? "border-primary/40 bg-primary/5" : "border-dashed",
                disabled && "cursor-not-allowed opacity-60",
              )}
            >
              <input
                type="checkbox"
                checked={options[key] && !disabled}
                disabled={disabled}
                onChange={(e) => handleToggle(key, e.target.checked)}
                className="mt-0.5 size-4 shrink-0 accent-primary outline-none"
              />
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="font-medium">{title}</span>
                <span className="text-xs text-foreground/75">{text}</span>
                <span className="text-xs text-foreground/75">{gain(options, key)}</span>
              </span>
            </label>
          );
        })}
      </div>

      <dl aria-live="polite" className="grid grid-cols-1 gap-2 min-[420px]:grid-cols-2">
        {[
          { label: "Time to first byte (TTFB)", value: result.ttfb, base: baseline.ttfb, extra: result.ttfb <= 800 ? "Good (≤ 800 ms)" : "Over the 800 ms “good” limit" },
          { label: "HTML fully downloaded", value: result.done, base: baseline.done, extra: null },
        ].map((row) => (
          <div key={row.label} className="rounded-lg border p-3">
            <dt className="text-xs text-muted-foreground">{row.label}</dt>
            <dd className="font-mono text-lg font-semibold tabular-nums">
              {row.value.toLocaleString("en-US")} ms
              {row.value < row.base ? <span className="ml-2 text-xs font-medium text-success">−{row.base - row.value} ms</span> : null}
            </dd>
            {row.extra ? <dd className="text-xs text-muted-foreground">{row.extra}</dd> : null}
          </div>
        ))}
      </dl>

      <figure className="flex flex-col gap-3">
        <figcaption className="text-xs font-medium">Simulated request timeline</figcaption>
        <div aria-hidden className="flex h-4 overflow-hidden rounded-sm bg-muted/60">
          {result.phases.map((phase) =>
            phase.ms > 0 ? (
              <span
                key={phase.id}
                className={cn("h-full motion-safe:transition-[width] motion-safe:duration-300", PHASE_CLASS[phase.id])}
                style={{ width: `${(phase.ms / total) * 100}%` }}
              />
            ) : null,
          )}
        </div>
        <ol className="grid gap-1.5 text-sm">
          {result.phases.map((phase) => (
            <li key={phase.id} className="grid grid-cols-[auto_1fr_auto] items-baseline gap-x-2">
              <span aria-hidden className={cn("inline-block size-2.5 rounded-sm", PHASE_CLASS[phase.id])} />
              <span className="min-w-0">
                {phase.label} <span className="text-xs text-muted-foreground">· {phase.note}</span>
              </span>
              <span className="font-mono text-xs tabular-nums">{phase.ms} ms</span>
            </li>
          ))}
        </ol>
      </figure>
    </div>
  );
}
