"use client";

import { CircleCheck, CircleX, TriangleAlert } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { useSupportsEntryType } from "./use-supports";
import { formatMetric, METRICS, rate, RATING_LABEL, RATING_TEXT, type MetricId, type MetricInfo, type Rating } from "./vitals";

type Values = Partial<Record<MetricId, number>>;

const ENTRY_TYPE: Record<MetricId, string> = {
  TTFB: "navigation",
  FCP: "paint",
  LCP: "largest-contentful-paint",
  CLS: "layout-shift",
  INP: "event",
};

const WAITING: Record<MetricId, string> = {
  TTFB: "Waiting for the load…",
  FCP: "Waiting for the first paint…",
  LCP: "Waiting for the largest paint…",
  CLS: "No shift yet",
  INP: "Click, tap or press a key anywhere to measure",
};

const RATING_ICON: Record<Rating, typeof CircleCheck> = {
  good: CircleCheck,
  "needs-improvement": TriangleAlert,
  poor: CircleX,
};

type LayoutShift = PerformanceEntry & { value: number; hadRecentInput: boolean };
type EventTiming = PerformanceEventTiming & { interactionId?: number };

function observe(type: string, onEntries: (entries: PerformanceEntryList) => void, extra?: object) {
  if (!PerformanceObserver.supportedEntryTypes.includes(type)) return null;
  const observer = new PerformanceObserver((list) => onEntries(list.getEntries()));
  observer.observe({ type, buffered: true, ...extra } as PerformanceObserverInit);
  return observer;
}

/** This tab's own Core Web Vitals, collected the way the web-vitals library defines them (simplified). */
export function VitalsMeter() {
  const [values, setValues] = useState<Values>({});
  const [loadedPath, setLoadedPath] = useState<string | null>(null);

  useEffect(() => {
    const set = (id: MetricId, value: number) => setValues((v) => (v[id] === value ? v : { ...v, [id]: value }));

    // CLS: the largest burst ("session window") of unexpected shifts: shifts less
    // than 1 s apart, at most 5 s long. Shifts right after input don't count.
    let session = 0;
    let sessionStart = 0;
    let lastShift = 0;
    let cls = 0;
    // INP: the slowest interaction (fine below 50 interactions; above that web-vitals takes the 98th percentile).
    const interactions = new Map<number, number>();

    const observers = [
      observe("navigation", (entries) => {
        const nav = entries[0] as PerformanceNavigationTiming | undefined;
        if (!nav) return;
        set("TTFB", nav.responseStart);
        setLoadedPath(new URL(nav.name).pathname);
      }),
      observe("paint", (entries) => {
        const fcp = entries.find((e) => e.name === "first-contentful-paint");
        if (fcp) set("FCP", fcp.startTime);
      }),
      observe("largest-contentful-paint", (entries) => set("LCP", entries[entries.length - 1].startTime)),
      observe("layout-shift", (entries) => {
        for (const entry of entries as LayoutShift[]) {
          if (entry.hadRecentInput) continue;
          const fresh = entry.startTime - lastShift > 1000 || entry.startTime - sessionStart > 5000;
          if (fresh) {
            session = 0;
            sessionStart = entry.startTime;
          }
          session += entry.value;
          lastShift = entry.startTime;
          cls = Math.max(cls, session);
        }
        set("CLS", cls);
      }),
      observe(
        "event",
        (entries) => {
          for (const entry of entries as EventTiming[]) {
            if (!entry.interactionId) continue;
            interactions.set(entry.interactionId, Math.max(interactions.get(entry.interactionId) ?? 0, entry.duration));
          }
          if (interactions.size > 0) set("INP", Math.max(...interactions.values()));
        },
        { durationThreshold: 16 },
      ),
    ];
    return () => observers.forEach((o) => o?.disconnect());
  }, []);

  // Set only in the browser, so reading the address here is safe.
  const softNavigated = loadedPath !== null && loadedPath !== window.location.pathname;

  return (
    <div className="flex flex-col gap-4">
      <ul className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 lg:grid-cols-5">
        {METRICS.map((info) => (
          <MetricCard key={info.id} info={info} value={values[info.id]} />
        ))}
      </ul>
      {softNavigated ? (
        <div className="flex flex-col items-start gap-2 rounded-lg border p-3 text-sm sm:flex-row sm:items-center sm:justify-between">
          <p className="text-muted-foreground">
            You arrived here without a full page load, so TTFB, FCP and LCP belong to the first page this tab opened (
            <span className="font-mono text-foreground">{loadedPath}</span>). Reload to measure this page.
          </p>
          <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
            Reload
          </Button>
        </div>
      ) : null}
      <p className="text-xs text-muted-foreground">
        Measured in your browser for this tab. One visit is a single sample; real thresholds apply to the 75th percentile of
        many visits. Development builds are slower than production.
      </p>
    </div>
  );
}

function MetricCard({ info, value }: { info: MetricInfo; value: number | undefined }) {
  const supported = useSupportsEntryType(ENTRY_TYPE[info.id]);
  const rating = value === undefined ? null : rate(info, value);
  const Icon = rating ? RATING_ICON[rating] : null;
  const goodLimit = info.unit === "score" ? `≤ ${info.thresholds[0]}` : `≤ ${formatMetric(info, info.thresholds[0])}`;

  return (
    <li className="flex min-w-0 flex-col gap-1 rounded-lg border bg-card p-3">
      <p className="flex items-baseline justify-between gap-2">
        <abbr title={info.name} className="font-mono text-sm font-semibold no-underline">
          {info.id}
        </abbr>
        {info.core ? <span className="text-[0.6875rem] text-muted-foreground">Core Web Vital</span> : null}
      </p>
      <p className="text-xs text-muted-foreground">{info.name}</p>
      {!supported ? (
        <p className="mt-1 text-sm text-muted-foreground">Not supported in this browser</p>
      ) : value === undefined ? (
        <p className="mt-1 text-sm text-muted-foreground">{WAITING[info.id]}</p>
      ) : (
        <>
          <p className="mt-1 font-mono text-xl font-semibold tabular-nums">
            {formatMetric(info, value)}
          </p>
          {rating && Icon ? (
            <p className={cn("flex items-center gap-1 text-xs font-medium", RATING_TEXT[rating])}>
              <Icon aria-hidden className="size-3.5" />
              {RATING_LABEL[rating]}
            </p>
          ) : null}
        </>
      )}
      <p className="mt-auto pt-1 text-xs text-muted-foreground">Good {goodLimit}</p>
    </li>
  );
}
