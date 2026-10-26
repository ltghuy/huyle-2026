"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { ALL_OPTIMIZATIONS, NO_OPTIMIZATIONS, simulate, type LoadOptions, type LoadResult, type SegmentKind } from "./critical-path";

const OPTIONS: { key: keyof LoadOptions; title: string; code: string }[] = [
  { key: "deferScript", title: "Defer the script", code: "<script defer>" },
  { key: "inlineCriticalCss", title: "Inline critical CSS", code: "<style>…</style>" },
  { key: "preloadHero", title: "Preload the hero image", code: '<link rel="preload">' },
  { key: "heroHighPriority", title: "High priority hero", code: 'fetchpriority="high"' },
  { key: "preconnectFonts", title: "Preconnect to fonts", code: '<link rel="preconnect">' },
];

const SEGMENT_CLASS: Record<SegmentKind, string> = {
  connect: "bg-muted-foreground/35",
  download: "bg-primary/70",
  execute: "bg-[repeating-linear-gradient(135deg,var(--primary)_0_3px,transparent_3px_6px)] border border-primary/70",
};

const SEGMENT_LABEL: Record<SegmentKind, string> = { connect: "Connect", download: "Download", execute: "Run script" };

const same = (a: LoadOptions, b: LoadOptions) => OPTIONS.every(({ key }) => a[key] === b[key]);
const ms = (value: number) => `${value.toLocaleString("en-US")} ms`;

/** What turning one option on gains, given the others as they are. */
function gain(options: LoadOptions, key: keyof LoadOptions): string {
  const on = simulate({ ...options, [key]: true });
  const off = simulate({ ...options, [key]: false });
  const parts = [
    off.fcp - on.fcp > 0 ? `first paint −${off.fcp - on.fcp} ms` : null,
    off.lcp - on.lcp > 0 ? `largest paint −${off.lcp - on.lcp} ms` : null,
    off.fontReady - on.fontReady > 0 ? `font −${off.fontReady - on.fontReady} ms` : null,
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : "no gain yet: something else is still the bottleneck";
}

export function CriticalPathDemo() {
  const [options, setOptions] = useState<LoadOptions>(NO_OPTIMIZATIONS);
  const result = simulate(options);
  const baseline = simulate(NO_OPTIMIZATIONS);
  const preset = same(options, NO_OPTIMIZATIONS) ? "Unoptimized" : same(options, ALL_OPTIMIZATIONS) ? "All on" : "Custom";

  function handleToggle(key: keyof LoadOptions, on: boolean) {
    setOptions((current) => ({ ...current, [key]: on }));
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-sm font-medium">
          Techniques <span className="font-normal text-foreground/75">· {preset}</span>
        </p>
        <div className="ml-auto flex gap-2">
          <Button variant="outline" size="sm" aria-pressed={preset === "Unoptimized"} onClick={() => setOptions(NO_OPTIMIZATIONS)}>
            Unoptimized
          </Button>
          <Button variant="outline" size="sm" aria-pressed={preset === "All on"} onClick={() => setOptions(ALL_OPTIMIZATIONS)}>
            All on
          </Button>
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {OPTIONS.map(({ key, title, code }) => (
          <label
            key={key}
            className={cn(
              "flex cursor-pointer gap-2 rounded-lg border p-3 text-sm has-focus-visible:ring-3 has-focus-visible:ring-ring/50",
              options[key] ? "border-primary/40 bg-primary/5" : "border-dashed",
            )}
          >
            <input
              type="checkbox"
              checked={options[key]}
              onChange={(e) => handleToggle(key, e.target.checked)}
              className="mt-0.5 size-4 shrink-0 accent-primary outline-none"
            />
            <span className="flex min-w-0 flex-col gap-0.5">
              <span className="font-medium">{title}</span>
              <code className="font-mono text-xs break-all text-foreground/75">{code}</code>
              <span className="text-xs text-foreground/75">{gain(options, key)}</span>
            </span>
          </label>
        ))}
      </div>

      <Summary result={result} baseline={baseline} />
      <Waterfall result={result} />
    </div>
  );
}

function Summary({ result, baseline }: { result: LoadResult; baseline: LoadResult }) {
  const rows = [
    { label: "First paint (FCP)", value: result.fcp, base: baseline.fcp },
    { label: "Largest paint (LCP)", value: result.lcp, base: baseline.lcp },
    { label: "Web font ready", value: result.fontReady, base: baseline.fontReady },
  ];
  return (
    <dl aria-live="polite" className="grid grid-cols-1 gap-2 min-[420px]:grid-cols-3">
      {rows.map((row) => (
        <div key={row.label} className="rounded-lg border p-3">
          <dt className="text-xs text-muted-foreground">{row.label}</dt>
          <dd className="font-mono text-lg font-semibold tabular-nums">
            {ms(row.value)}
            {row.value < row.base ? (
              <span className="ml-2 text-xs font-medium text-success">−{row.base - row.value} ms</span>
            ) : null}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function Waterfall({ result }: { result: LoadResult }) {
  const scale = 1400;
  const pct = (value: number) => `${(value / scale) * 100}%`;
  const markers = [
    { label: "FCP", at: result.fcp },
    { label: "LCP", at: result.lcp },
  ];

  return (
    <figure className="flex flex-col gap-3">
      <figcaption className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span className="font-medium text-foreground">Simulated waterfall</span>
        {(Object.keys(SEGMENT_LABEL) as SegmentKind[]).map((kind) => (
          <span key={kind} className="inline-flex items-center gap-1.5">
            <span aria-hidden className={cn("inline-block h-2.5 w-5 rounded-sm", SEGMENT_CLASS[kind])} />
            {SEGMENT_LABEL[kind]}
          </span>
        ))}
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden className="inline-block h-3 w-0 border-l-2 border-dashed border-foreground" />
          Paint milestones
        </span>
      </figcaption>

      <div className="relative pt-6">
        <ol className="flex flex-col gap-3">
          {result.requests.map((request) => (
            <li key={request.id} className="flex flex-col gap-1">
              <p className="flex flex-wrap items-center gap-x-2 text-sm">
                <span className="font-mono text-xs break-all">{request.label}</span>
                {request.blocking ? (
                  <span className="rounded border px-1 text-[0.6875rem] leading-4 text-foreground/75">render-blocking</span>
                ) : null}
                <span className="sr-only">
                  {request.segments.map((s) => `${SEGMENT_LABEL[s.kind]} ${s.start}–${s.end} ms`).join(", ")}.
                </span>
              </p>
              <div aria-hidden className="relative h-3 rounded-sm bg-muted/60">
                {request.segments.map((segment) => (
                  <span
                    key={segment.kind}
                    className={cn("absolute inset-y-0 rounded-sm motion-safe:transition-[left,width] motion-safe:duration-300", SEGMENT_CLASS[segment.kind])}
                    style={{ left: pct(segment.start), width: pct(segment.end - segment.start) }}
                  />
                ))}
              </div>
              <p className="text-xs text-muted-foreground">{request.note}</p>
            </li>
          ))}
        </ol>
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-6 bottom-0">
          {markers.map((marker) => (
            <span
              key={marker.label}
              className="pointer-events-none absolute inset-y-0 border-l-2 border-dashed border-foreground/70 motion-safe:transition-[left] motion-safe:duration-300"
              style={{ left: pct(marker.at) }}
            >
              <span className="absolute -top-6 -translate-x-1/2 rounded bg-foreground px-1 font-mono text-[0.6875rem] leading-4 text-background">
                {marker.label}
              </span>
            </span>
          ))}
        </div>
      </div>
      <p aria-hidden className="flex justify-between font-mono text-[0.6875rem] text-muted-foreground">
        <span>0 ms</span>
        <span>700 ms</span>
        <span>1,400 ms</span>
      </p>
    </figure>
  );
}
