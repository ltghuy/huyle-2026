---
id: "016"
feature: performance-handbook
audited: 2026-10-08
result: passed
---

# Audit: Performance Handbook

Second audit, after the extension to all 14 course modules (decisions D5, D6). Evidence comes from a production build (`pnpm build && pnpm start -p 3123`) in headless Chrome:
- the Puppeteer MCP for interactive checks with real clicks and hovers;
- a Puppeteer script with real keyboard input, axe-core 4.10.2 in both themes, and a 360 px viewport;
- Node scripts (`--experimental-strip-types`) that check the critical-path, HTML-delivery and blur modules directly.

Quality gate re-run at audit time: `pnpm typecheck && pnpm lint && pnpm build` pass. Timings are from one development machine.

| Target | Classification | Evidence |
|--------|----------------|----------|
| G1: One click from sidebar, home, section page | Met | Sidebar folder lists `/performance-accessibility/performance` and `/…/accessibility` (coming soon). The home card links to `/performance-accessibility` and shows "1 of 2 pages written". The section page cards link to both pages. Filtering for "access" shows Accessible Modal and the Accessibility page |
| G2: Seven topics, each short, each demo reacts | Met | 1,492 words of prose outside the demos and the table of contents. Every topic has key points, a demo, Do/Avoid and module links. Demo results are in SC1 |
| G3: Every course module covered and linked | Met | The page links all 14 modules: welcome, why-speed-matters, general-html-performance, understanding-the-critical-path, optimize-resource-loading, resource-hints, image-performance, video-performance, lazy-load-images-and-iframe-elements, optimize-web-fonts, code-split-javascript, prefetching-prerendering-precaching, web-worker-overview, web-worker-demo. The notes cover redirects, HTML caching, compression, CDNs, Server-Timing, `dns-prefetch`, video, iframes and facades, Speculation Rules and service worker precaching |
| G4: Measured vs simulated labelled | Met | Vitals, layout shift, chunk download, long tasks, frames and checksums come from browser APIs. The waterfall, HTML-delivery timeline and font timing are labelled simulated. The 600 ms code-loading delay is labelled and shown apart from the measured download |
| SC1: All seven demos react | Met | See the demo results table below |
| SC2: ~12-minute read (< ~1,800 words) | Met | 1,492 words |
| SC3: 0 serious/critical axe both themes; no sideways scroll at 360 px | Met | Only the moderate `region` finding from the shell (feature 001). `scrollWidth` is 360 on all three pages |

## SC1 demo results

| Demo | Result |
|------|--------|
| HTML delivery | TTFB 1,450 → 115 ms; HTML fully downloaded 1,642 → 144 ms |
| Critical path | FCP 870 → 500 ms; LCP 1,340 → 640 ms; font ready 1,270 → 770 ms |
| Layout shift | 0.043 with the text moving 370 px when space isn't reserved; 0.000 and 0 px when it is |
| Fonts, 1.5 s arrival | At 0.6 s only `block` is invisible; at 2 s `block` and `swap` use the web font and `optional` stays on the fallback |
| Fonts, 4 s arrival | `block` falls back after 3 s |
| Fonts, 80 ms arrival | All three use the web font |
| Code splitting | Cold wait 601 ms vs 165 ms after hover prefetch |
| Blur | Same checksum `7d1439b5` in all three modes. One go: 381 ms, a 380 ms long task, 45 frames dropped, and 3 keystrokes took 444 ms. Chunks and worker: no long task, 0 frames dropped, keystrokes about 100 ms |

## Known minor issues (not blocking)

- axe reports a moderate `region` finding on every page; it comes from the shell (feature 001).
- AC-005 ("not supported in this browser") was checked by reading the code only, because Chrome supports every entry type used. Safari doesn't support the `longtask` and `event` entry types, so it shows the unsupported text there.
- The lazily loaded chunk in the code-splitting demo is about 1 KB. The text says real candidates (charts, editors) are often 100 KB or more.
- "Frames dropped" is counted at the display's own refresh rate, so a 120 Hz screen shows about twice the 60 Hz number for the same freeze.
- The chart tokens in the neutral theme are greys, so HTML-delivery phases are told apart by lightness and by the labelled list under the bar.
