import { HttpError, type QueryKey } from "@/practices/data-fetching-hook/query-client";
import {
  WIDTHS,
  type Photo,
  type PhotoCount,
  type RunBody,
  type RunStats,
} from "@/server/practices/lazy-images/photos.schema";

const BASE = "/api/practices/lazy-images";

/** Static `sizes` for native and eager tiles (2 columns, 3 from 640 px). */
export const STATIC_SIZES = "(min-width: 1280px) 300px, (min-width: 640px) 30vw, 46vw";

export function photosKey(count: PhotoCount): QueryKey {
  return ["lazy-images", "photos", count];
}

export async function fetchPhotos(count: PhotoCount, signal: AbortSignal): Promise<Photo[]> {
  const res = await fetch(`${BASE}/photos?count=${count}&latencyMs=300`, { signal });
  const json = await res.json();
  if (!res.ok) throw new HttpError(res.status, json.error?.message ?? `HTTP ${res.status}`);
  return json.data;
}

export function imageUrl(photoId: string, width: number, run: string, attempt: number) {
  return `${BASE}/images/${photoId}?w=${width}&run=${run}&a=${attempt}`;
}

export function srcSetFor(photoId: string, run: string, attempt: number) {
  return WIDTHS.map((w) => `${imageUrl(photoId, w, run, attempt)} ${w}w`).join(", ");
}

const WIDTH_PARAM = /[?&]w=(\d+)/;

/** The candidate width the browser picked, from `currentSrc`. */
export function widthOf(url: string): number | null {
  const match = WIDTH_PARAM.exec(url);
  return match ? Number(match[1]) : null;
}

/** Body size of a loaded image from resource timing, if the browser kept the entry. */
export function bytesOf(url: string): number | null {
  if (typeof performance === "undefined") return null;
  const absolute = new URL(url, location.href).href;
  const entries = performance.getEntriesByName(absolute, "resource") as PerformanceResourceTiming[];
  const entry = entries.at(-1);
  return entry && entry.decodedBodySize > 0 ? entry.decodedBodySize : null;
}

/** Creates the run on the server, or updates its latency and failure rate. */
export async function saveRunSettings(body: RunBody): Promise<RunStats> {
  const res = await fetch(`${BASE}/runs`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!res.ok) throw new HttpError(res.status, json.error?.message ?? `HTTP ${res.status}`);
  return json.data;
}

export function statsStreamUrl(run: string) {
  return `${BASE}/runs/stream?run=${run}`;
}

export async function fetchRunStats(run: string, signal?: AbortSignal): Promise<RunStats> {
  const res = await fetch(`${BASE}/runs?run=${run}`, { signal, cache: "no-store" });
  const json = await res.json();
  if (!res.ok) throw new HttpError(res.status, json.error?.message ?? `HTTP ${res.status}`);
  return json.data;
}
