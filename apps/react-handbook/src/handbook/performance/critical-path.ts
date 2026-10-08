// A deterministic model of how a small page loads, for the critical-path demo.
// Not a real network: round numbers chosen so each technique's effect is easy
// to read. Assumptions: the server answers in 300 ms (first bytes at 320 ms,
// HTML done at 450 ms); styles are 250 ms to download; the script 350 ms plus
// 150 ms to run; a new origin costs 300 ms to connect (DNS + TCP + TLS); the
// hero image downloads in 500 ms at the default (low) priority and 300 ms at
// high priority; painting takes 50 ms after rendering is unblocked.

export type LoadOptions = {
  deferScript: boolean;
  inlineCriticalCss: boolean;
  preloadHero: boolean;
  heroHighPriority: boolean;
  preconnectFonts: boolean;
};

export const NO_OPTIMIZATIONS: LoadOptions = {
  deferScript: false,
  inlineCriticalCss: false,
  preloadHero: false,
  heroHighPriority: false,
  preconnectFonts: false,
};

export const ALL_OPTIMIZATIONS: LoadOptions = {
  deferScript: true,
  inlineCriticalCss: true,
  preloadHero: true,
  heroHighPriority: true,
  preconnectFonts: true,
};

export type SegmentKind = "connect" | "download" | "execute";
export type Segment = { kind: SegmentKind; start: number; end: number };

export type Request = {
  id: "html" | "css" | "js" | "font" | "hero";
  label: string;
  segments: Segment[];
  /** Holds back the first paint. */
  blocking: boolean;
  note: string;
};

export type LoadResult = { requests: Request[]; fcp: number; lcp: number; fontReady: number };

const FIRST_BYTES = 320;
const HTML_DONE = 450;
const CSS_TIME = 250;
const JS_DOWNLOAD = 350;
const JS_EXECUTE = 150;
const CONNECT = 300;
const FONT_TIME = 150;
const PAINT = 50;
const HERO_LOW = 500;
const HERO_HIGH = 300;

export function simulate(o: LoadOptions): LoadResult {
  const cssEnd = FIRST_BYTES + CSS_TIME;
  const jsDownloaded = FIRST_BYTES + JS_DOWNLOAD;
  // A deferred script runs once the HTML is parsed; a classic one runs as soon as it arrives, pausing the parser.
  const jsStartRun = o.deferScript ? Math.max(jsDownloaded, HTML_DONE) : jsDownloaded;
  const jsEnd = jsStartRun + JS_EXECUTE;

  const renderStart = Math.max(HTML_DONE, o.inlineCriticalCss ? 0 : cssEnd, o.deferScript ? 0 : jsEnd);
  const fcp = renderStart + PAINT;

  // The hero is a CSS background and the font is in @font-face: the browser finds them only when it
  // computes styles (renderStart), unless a preload or preconnect starts them early.
  const heroStart = o.preloadHero ? FIRST_BYTES : renderStart;
  const heroEnd = heroStart + (o.heroHighPriority ? HERO_HIGH : HERO_LOW);
  const lcp = Math.max(fcp, heroEnd + 20);

  const connectStart = o.preconnectFonts ? FIRST_BYTES : renderStart;
  const connectEnd = connectStart + CONNECT;
  const fontStart = Math.max(renderStart, connectEnd);
  const fontEnd = fontStart + FONT_TIME;

  const requests: Request[] = [
    {
      id: "html",
      label: "index.html",
      segments: [{ kind: "download", start: 0, end: HTML_DONE }],
      blocking: true,
      note: "The document: nothing renders before it arrives.",
    },
    {
      id: "css",
      label: "styles.css",
      segments: [{ kind: "download", start: FIRST_BYTES, end: cssEnd }],
      blocking: !o.inlineCriticalCss,
      note: o.inlineCriticalCss
        ? "Critical styles are inlined in the HTML; the full file loads without blocking."
        : "Stylesheets block rendering until they arrive.",
    },
    {
      id: "js",
      label: "app.js",
      segments: [
        { kind: "download", start: FIRST_BYTES, end: jsDownloaded },
        { kind: "execute", start: jsStartRun, end: jsEnd },
      ],
      blocking: !o.deferScript,
      note: o.deferScript
        ? "defer: downloads in parallel, runs after the HTML is parsed."
        : "A classic script in <head> stops the parser until it has downloaded and run.",
    },
    {
      id: "font",
      label: "fonts.example.com/inter.woff2",
      segments: [
        { kind: "connect", start: connectStart, end: connectEnd },
        { kind: "download", start: fontStart, end: fontEnd },
      ],
      blocking: false,
      note: o.preconnectFonts
        ? "preconnect opened the connection early; text swaps to the font when it arrives."
        : "A new origin needs DNS, TCP and TLS first; text shows in a fallback font until then (font-display: swap).",
    },
    {
      id: "hero",
      label: "hero.avif (LCP)",
      segments: [{ kind: "download", start: heroStart, end: heroEnd }],
      blocking: false,
      note: [
        o.preloadHero ? "preload: requested with the HTML's first bytes" : "Found only once styles are computed (CSS background)",
        o.heroHighPriority ? "fetchpriority=high: downloaded first" : "low priority: shares bandwidth",
      ].join("; ") + ".",
    },
  ];

  return { requests, fcp, lcp, fontReady: fontEnd };
}
