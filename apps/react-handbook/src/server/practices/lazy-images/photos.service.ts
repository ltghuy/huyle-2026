import "server-only";

import {
  PHOTO_COUNTS,
  type ImageWidth,
  type Photo,
  type RunSettings,
  type RunStats,
} from "./photos.schema";

// Mock photo service. Each photo is a seeded SVG landscape, so it is the same
// on every request; its grain detail grows with the requested width, so wider
// srcset candidates really cost more bytes.

const VIEW_W = 1280;
const MAX_PHOTOS = PHOTO_COUNTS[PHOTO_COUNTS.length - 1];
const MAX_RUNS = 50;

type Palette = { top: string; bottom: string; name: string };

const PALETTES: Palette[] = [
  { top: "#1e3a8a", bottom: "#f59e0b", name: "amber dusk" },
  { top: "#0f766e", bottom: "#99f6e4", name: "teal morning" },
  { top: "#581c87", bottom: "#f472b6", name: "violet sunset" },
  { top: "#0c4a6e", bottom: "#7dd3fc", name: "clear blue" },
  { top: "#7c2d12", bottom: "#fdba74", name: "orange haze" },
  { top: "#14532d", bottom: "#bbf7d0", name: "misty green" },
  { top: "#312e81", bottom: "#a5b4fc", name: "indigo night" },
  { top: "#831843", bottom: "#fda4af", name: "rose dawn" },
];

// Width : height. Mixed on purpose so reserved space is visible.
const RATIOS: [number, number][] = [[4, 3], [3, 2], [1, 1], [3, 4], [16, 9], [2, 3]];

const ADJECTIVES = ["Quiet", "Distant", "Silver", "Hidden", "Golden", "Windy", "Lonely", "Bright", "Misty", "Wild", "Calm", "Far"];
const NOUNS = ["Ridge", "Valley", "Peaks", "Pass", "Summit", "Hills", "Range", "Slopes"];
const RIDGE_WORDS = ["Two", "Three", "Four"];

/** Small deterministic PRNG (mulberry32). */
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Scene = {
  photo: Photo;
  palette: Palette;
  height: number;
  sun: { x: number; y: number; r: number; moon: boolean };
  ridges: number[][];
  seed: number;
};

function makeScene(index: number): Scene {
  const seed = (index + 1) * 7919;
  const random = rng(seed);
  const palette = PALETTES[index % PALETTES.length];
  const [rw, rh] = RATIOS[(index * 5) % RATIOS.length];
  const height = Math.round((VIEW_W * rh) / rw);
  const moon = palette.name.includes("night") || random() < 0.2;
  const sun = {
    x: Math.round(VIEW_W * (0.15 + random() * 0.7)),
    y: Math.round(height * (0.18 + random() * 0.3)),
    r: Math.round(VIEW_W * (0.05 + random() * 0.04)),
    moon,
  };
  const ridgeCount = 2 + (index % 3);
  const ridges = Array.from({ length: ridgeCount }, (_, layer) => {
    const base = height * (0.55 + (layer / ridgeCount) * 0.3);
    const points = 9;
    return Array.from({ length: points }, () => Math.round(base - random() * height * 0.18));
  });
  const id = `ph-${String(index + 1).padStart(2, "0")}`;
  const title = `${ADJECTIVES[index % ADJECTIVES.length]} ${NOUNS[(index * 3) % NOUNS.length]}`;
  const side = sun.x < VIEW_W / 3 ? "on the left" : sun.x > (VIEW_W * 2) / 3 ? "on the right" : "in the middle";
  const article = /^[aeiou]/.test(palette.name) ? "an" : "a";
  const alt = `${RIDGE_WORDS[ridgeCount - 2]} mountain ridges under ${article} ${palette.name} sky, ${moon ? "a pale moon" : "the sun"} ${side}`;
  return {
    photo: { id, title, alt, width: VIEW_W, height, color: palette.bottom, preview: "" },
    palette,
    height,
    sun,
    ridges,
    seed,
  };
}

function ridgePath(ys: number[], width: number, height: number, precision = 1) {
  const step = width / (ys.length - 1);
  const round = (n: number) => Math.round(n * precision) / precision;
  const points = ys.map((y, i) => `${round(i * step)},${round(y)}`).join(" ");
  return `M0,${height} L${points} L${width},${height} Z`;
}

function ridgeLayers(scene: Scene, scale: number, precision?: number) {
  const { ridges, palette } = scene;
  return ridges
    .map((ys, layer) => {
      const opacity = (0.35 + (0.6 * (layer + 1)) / ridges.length).toFixed(2);
      const path = ridgePath(ys.map((y) => y * scale), VIEW_W * scale, scene.height * scale, precision);
      return `<path d="${path}" fill="${palette.top}" fill-opacity="${opacity}"/>`;
    })
    .join("");
}

function previewUri(scene: Scene) {
  // 32 px wide: a handful of shapes, blurred on the client.
  const scale = 32 / VIEW_W;
  const h = Math.round(scene.height * scale);
  const { palette, sun } = scene;
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 ${h}">` +
    `<defs><linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${palette.top}"/><stop offset="1" stop-color="${palette.bottom}"/></linearGradient></defs>` +
    `<rect width="32" height="${h}" fill="url(#s)"/>` +
    `<circle cx="${Math.round(sun.x * scale)}" cy="${Math.round(sun.y * scale)}" r="${Math.max(1, Math.round(sun.r * scale))}" fill="#fff7ed" fill-opacity="0.85"/>` +
    ridgeLayers(scene, scale, 10) +
    `</svg>`;
  // Minimal escaping keeps the inline preview small (single quotes need none).
  const escaped = svg.replaceAll('"', "'").replace(/[%#<>]/g, (c) => encodeURIComponent(c));
  return `data:image/svg+xml,${escaped}`;
}

let scenes: Scene[] | null = null;
let byId: Map<string, Scene> | null = null;

// Built on first use, not at import (route modules are imported by builds).
function allScenes() {
  if (!scenes) {
    scenes = Array.from({ length: MAX_PHOTOS }, (_, i) => {
      const scene = makeScene(i);
      scene.photo.preview = previewUri(scene);
      return scene;
    });
    byId = new Map(scenes.map((s) => [s.photo.id, s]));
  }
  return { scenes, byId: byId! };
}

export function listPhotos(count: number): Photo[] {
  return allScenes().scenes.slice(0, count).map((s) => s.photo);
}

export function renderPhoto(id: string, w: ImageWidth): string | null {
  const scene = allScenes().byId.get(id);
  if (!scene) return null;
  const { palette, sun, height } = scene;
  const random = rng(scene.seed + w);
  // Grain/stars in the sky: detail proportional to the width.
  const dots: string[] = [];
  for (let i = 0; i < w / 2; i++) {
    const x = Math.round(random() * VIEW_W);
    const y = Math.round(random() * height * 0.6);
    const r = (1 + random() * 2).toFixed(1);
    const o = (0.15 + random() * 0.5).toFixed(2);
    dots.push(`<circle cx="${x}" cy="${y}" r="${r}" fill="#fff" fill-opacity="${o}"/>`);
  }
  const sunFill = sun.moon ? "#f1f5f9" : "#fff7ed";
  const label = `${w}w`;
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${Math.round((w * height) / VIEW_W)}" viewBox="0 0 ${VIEW_W} ${height}">` +
    `<defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${palette.top}"/><stop offset="1" stop-color="${palette.bottom}"/></linearGradient></defs>` +
    `<rect width="${VIEW_W}" height="${height}" fill="url(#sky)"/>` +
    dots.join("") +
    `<circle cx="${sun.x}" cy="${sun.y}" r="${sun.r}" fill="${sunFill}" fill-opacity="0.9"/>` +
    ridgeLayers(scene, 1) +
    `<rect x="${VIEW_W - 196}" y="${height - 92}" width="172" height="68" rx="14" fill="#000" fill-opacity="0.55"/>` +
    `<text x="${VIEW_W - 110}" y="${height - 44}" font-family="ui-monospace, monospace" font-size="44" font-weight="600" fill="#fff" text-anchor="middle">${label}</text>` +
    `</svg>`
  );
}

// Per-run settings and stats survive dev HMR and are shared by every route
// module through globalThis. Oldest runs are dropped beyond MAX_RUNS.
type RunRecord = { settings: RunSettings; stats: RunStats };
const holder = globalThis as typeof globalThis & { __lazyImageRuns?: Map<string, RunRecord> };
const runs = (holder.__lazyImageRuns ??= new Map());

const EMPTY_STATS: RunStats = { requests: 0, served: 0, failed: 0, cancelled: 0, bytes: 0, inFlight: 0 };

export function upsertRun(run: string, settings: RunSettings): RunStats {
  const existing = runs.get(run);
  if (existing) {
    existing.settings = settings;
    return { ...existing.stats };
  }
  runs.set(run, { settings, stats: { ...EMPTY_STATS } });
  while (runs.size > MAX_RUNS) runs.delete(runs.keys().next().value!);
  return { ...EMPTY_STATS };
}

export function getRunStats(run: string): RunStats | null {
  const record = runs.get(run);
  return record ? { ...record.stats } : null;
}

function sleep(ms: number, signal: AbortSignal): Promise<boolean> {
  return new Promise((resolve) => {
    if (signal.aborted) return resolve(false);
    const timer = setTimeout(() => {
      signal.removeEventListener("abort", onAbort);
      resolve(true);
    }, ms);
    function onAbort() {
      clearTimeout(timer);
      resolve(false);
    }
    signal.addEventListener("abort", onAbort, { once: true });
  });
}

export type ServeResult =
  | { kind: "ok"; svg: string }
  | { kind: "not-found" | "unknown-run" | "failed" | "cancelled" };

/** One image request: latency (±25 % jitter), cancellation, failure injection. */
export async function serveImage(
  id: string,
  w: ImageWidth,
  run: string,
  signal: AbortSignal,
): Promise<ServeResult> {
  const record = runs.get(run);
  if (!record) return { kind: "unknown-run" };
  if (!allScenes().byId.has(id)) return { kind: "not-found" };

  const { stats, settings } = record;
  stats.requests++;
  stats.inFlight++;
  try {
    const latency = settings.latencyMs * (0.75 + Math.random() * 0.5);
    const completed = await sleep(latency, signal);
    if (!completed) {
      stats.cancelled++;
      return { kind: "cancelled" };
    }
    if (Math.random() < settings.failRate) {
      stats.failed++;
      return { kind: "failed" };
    }
    const svg = renderPhoto(id, w)!;
    stats.served++;
    stats.bytes += Buffer.byteLength(svg);
    return { kind: "ok", svg };
  } finally {
    stats.inFlight--;
  }
}
