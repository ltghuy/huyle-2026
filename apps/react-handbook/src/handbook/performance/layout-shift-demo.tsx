"use client";

import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";

import { useSupportsEntryType } from "./use-supports";

/** How long the sample image takes to "download". Over 500 ms so the shift doesn't count as caused by the click. */
const IMAGE_DELAY = 1200;
const IMAGE_WIDTH = 1200;
const IMAGE_HEIGHT = 675;

// An inline landscape, so the demo needs no network; the delay stands in for the download.
const IMAGE_SRC = `data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 675"><defs><linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#93c5fd"/><stop offset="1" stop-color="#e0f2fe"/></linearGradient></defs><rect width="1200" height="675" fill="url(#s)"/><circle cx="900" cy="190" r="80" fill="#fde68a"/><path d="M0 480 L260 300 L470 450 L700 260 L1200 520 V675 H0Z" fill="#64748b"/><path d="M0 560 L340 430 L640 560 L920 450 L1200 590 V675 H0Z" fill="#334155"/></svg>`,
)}`;

/** Example file sizes for a responsive image's candidates. */
const CANDIDATES = [
  { width: 480, kb: 38 },
  { width: 800, kb: 92 },
  { width: 1200, kb: 180 },
  { width: 1600, kb: 300 },
];

type LayoutShift = PerformanceEntry & {
  value: number;
  hadRecentInput: boolean;
  sources?: { node: Node | null }[];
};

type Phase = "idle" | "loading" | "loaded";

export function LayoutShiftDemo() {
  const [reserve, setReserve] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const [shift, setShift] = useState<number | null>(null);
  const [moved, setMoved] = useState<number | null>(null);
  const articleRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLParagraphElement>(null);
  const timer = useRef<number | undefined>(undefined);
  const observer = useRef<PerformanceObserver | null>(null);
  const supported = useSupportsEntryType("layout-shift");

  useEffect(
    () => () => {
      window.clearTimeout(timer.current);
      observer.current?.disconnect();
    },
    [],
  );

  function handleLoad() {
    window.clearTimeout(timer.current);
    observer.current?.disconnect();
    setPhase("loading");
    setShift(null);
    setMoved(null);

    let total = 0;
    if (supported) {
      observer.current = new PerformanceObserver((list) => {
        for (const entry of list.getEntries() as LayoutShift[]) {
          const inside = entry.sources?.some((source) => source.node && articleRef.current?.contains(source.node));
          if (!entry.hadRecentInput && inside) total += entry.value;
        }
        setShift(total);
      });
      observer.current.observe({ type: "layout-shift" });
    }

    timer.current = window.setTimeout(() => {
      const before = textRef.current?.getBoundingClientRect().top ?? 0;
      setPhase("loaded");
      requestAnimationFrame(() => {
        const after = textRef.current?.getBoundingClientRect().top ?? 0;
        setMoved(Math.round(after - before));
        setShift((current) => current ?? 0);
      });
    }, IMAGE_DELAY);
  }

  function handleReset() {
    window.clearTimeout(timer.current);
    observer.current?.disconnect();
    setPhase("idle");
    setShift(null);
    setMoved(null);
  }

  function handleReserveChange(next: boolean) {
    setReserve(next);
    handleReset();
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={reserve}
            onChange={(e) => handleReserveChange(e.target.checked)}
            className="size-4 accent-primary"
          />
          Reserve the image&apos;s space (<code className="font-mono text-xs">width</code> and{" "}
          <code className="font-mono text-xs">height</code>)
        </label>
        <div className="ml-auto flex gap-2">
          <Button size="sm" onClick={handleLoad} disabled={phase === "loading"}>
            {phase === "idle" ? "Load article" : "Load again"}
          </Button>
          <Button variant="outline" size="sm" onClick={handleReset} disabled={phase === "idle"}>
            Reset
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-[1fr_14rem]">
        <div ref={articleRef} className="min-w-0 rounded-lg border p-4">
          {phase === "idle" ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Press “Load article”. The image arrives 1.2 s after the text.</p>
          ) : (
            <article className="flex flex-col gap-3">
              <h4 className="font-semibold">Hiking the ridge at dawn</h4>
              {phase === "loaded" ? (
                // eslint-disable-next-line @next/next/no-img-element -- the demo is about the plain <img> attributes
                <img
                  src={IMAGE_SRC}
                  alt="Mountains under a morning sky"
                  width={reserve ? IMAGE_WIDTH : undefined}
                  height={reserve ? IMAGE_HEIGHT : undefined}
                  className="h-auto w-full rounded-md"
                />
              ) : reserve ? (
                <div className="aspect-[1200/675] w-full animate-pulse rounded-md bg-muted motion-reduce:animate-none" aria-hidden />
              ) : null}
              <p ref={textRef} className="text-sm">
                The trail leaves the car park at 5 a.m. and climbs through pine forest for an hour before it opens onto the ridge.
                <span className="ml-1 rounded bg-primary/10 px-1 font-medium">Try to click this sentence</span> while the image loads.
              </p>
            </article>
          )}
        </div>

        <div className="grid content-start gap-2 text-sm">
          <dl aria-live="polite" className="grid gap-2">
          <div className="rounded-lg border p-3">
            <dt className="text-xs text-muted-foreground">Layout shift (measured)</dt>
            <dd className="font-mono text-lg font-semibold tabular-nums">
              {!supported ? "Not supported" : shift === null ? "—" : shift.toFixed(3)}
            </dd>
          </div>
          <div className="rounded-lg border p-3">
            <dt className="text-xs text-muted-foreground">Text moved</dt>
            <dd className="font-mono text-lg font-semibold tabular-nums">{moved === null ? "—" : `${moved} px`}</dd>
          </div>
          </dl>
          <p className="text-xs text-muted-foreground">Good CLS for a whole page is ≤ 0.1. Watch the CLS card at the top change too.</p>
        </div>
      </div>

      <ResponsivePick />
    </div>
  );
}

/** Which candidate a responsive image (srcset + sizes) would download for this box. */
function ResponsivePick() {
  const boxRef = useRef<HTMLDivElement>(null);
  const [need, setNeed] = useState<{ css: number; dpr: number } | null>(null);

  useEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    const observer = new ResizeObserver(([entry]) => {
      setNeed({ css: Math.round(entry.contentRect.width), dpr: window.devicePixelRatio || 1 });
    });
    observer.observe(box);
    return () => observer.disconnect();
  }, []);

  const pixels = need ? Math.round(need.css * need.dpr) : 0;
  const pick = CANDIDATES.find((c) => c.width >= pixels) ?? CANDIDATES[CANDIDATES.length - 1];
  const largest = CANDIDATES[CANDIDATES.length - 1];

  return (
    <div ref={boxRef} className="flex flex-col gap-2 rounded-lg border border-dashed p-3 text-sm">
      <p className="font-medium">Responsive images: the right file for this box</p>
      <code className="font-mono text-xs break-all text-foreground/75">
        srcset=&quot;{CANDIDATES.map((c) => `hero-${c.width}.avif ${c.width}w`).join(", ")}&quot; sizes=&quot;100vw&quot;
      </code>
      {need ? (
        <p aria-live="polite" className="text-foreground/85">
          This box is <span className="font-mono tabular-nums">{need.css}</span> CSS px wide at a pixel ratio of{" "}
          <span className="font-mono tabular-nums">{need.dpr}</span>, so it needs <span className="font-mono tabular-nums">{pixels}</span>{" "}
          px: the browser picks <span className="font-mono">hero-{pick.width}.avif</span> ({pick.kb} KB)
          {pick.width < largest.width ? `, ${largest.kb - pick.kb} KB less than always sending the ${largest.width} px file` : ""}.
          Resize the window to see it change.
        </p>
      ) : null}
      <p className="text-xs text-muted-foreground">File sizes are examples.</p>
    </div>
  );
}
