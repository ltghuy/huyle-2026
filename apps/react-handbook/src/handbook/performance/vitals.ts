// Core Web Vitals (and two supporting metrics) with web.dev's thresholds.
// "Good" and "poor" are judged at the 75th percentile of real page loads.

export type MetricId = "TTFB" | "FCP" | "LCP" | "CLS" | "INP";
export type Rating = "good" | "needs-improvement" | "poor";

export type MetricInfo = {
  id: MetricId;
  name: string;
  /** Upper bound of "good" and of "needs improvement". */
  thresholds: [number, number];
  unit: "ms" | "score";
  core: boolean;
};

export const METRICS: MetricInfo[] = [
  { id: "LCP", name: "Largest Contentful Paint", thresholds: [2500, 4000], unit: "ms", core: true },
  { id: "INP", name: "Interaction to Next Paint", thresholds: [200, 500], unit: "ms", core: true },
  { id: "CLS", name: "Cumulative Layout Shift", thresholds: [0.1, 0.25], unit: "score", core: true },
  { id: "FCP", name: "First Contentful Paint", thresholds: [1800, 3000], unit: "ms", core: false },
  { id: "TTFB", name: "Time to First Byte", thresholds: [800, 1800], unit: "ms", core: false },
];

export function rate(info: MetricInfo, value: number): Rating {
  if (value <= info.thresholds[0]) return "good";
  if (value <= info.thresholds[1]) return "needs-improvement";
  return "poor";
}

export function formatMetric(info: MetricInfo, value: number) {
  if (info.unit === "score") return value.toFixed(3);
  return value < 1000 ? `${Math.round(value)} ms` : `${Number((value / 1000).toFixed(2))} s`;
}

export const RATING_LABEL: Record<Rating, string> = {
  good: "Good",
  "needs-improvement": "Needs improvement",
  poor: "Poor",
};

/** Text colors per rating; warning text is darkened in light mode for contrast. */
export const RATING_TEXT: Record<Rating, string> = {
  good: "text-success",
  "needs-improvement": "text-[color-mix(in_oklch,var(--warning),black_40%)] dark:text-warning",
  poor: "text-destructive",
};
