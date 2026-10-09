---
id: "020"
feature: rendering-pipeline
audited: 2026-10-09
result: passed
---

# Audit: How the Browser Renders a Page

Evidence comes from the dev server (`pnpm dev`, port 3000):
- `curl` against the render-lab routes;
- Puppeteer scripts in headless Chrome: real clicks and typing, real sample-page loads, CDP screencast frames, axe-core 4.10.2 in both themes, reduced motion, and a 360 px viewport.

Quality gate re-run at audit time: `pnpm typecheck && pnpm lint && pnpm build` pass.

| Target | Classification | Evidence |
|--------|----------------|----------|
| G1: Reachable; Performance links to it | Met | Listed in the sidebar, on the section page and on the home card ("3 of 3 pages written"). The Performance critical-path topic links to `/browser-platform/rendering` |
| G2: Four short topics, each demo reacts | Met | ~820 words of prose outside the demos. Every topic has an intro, 4–5 points, a demo, Do/Avoid and links (every URL checked to return 200). Results in SC1 |
| G3: Measured results, simplifications labelled | Met | Loading timeline from the sample page's own events, Resource Timing and Paint Timing. Frame meter from rAF, labelled "Main-thread frames". Thrash times from `performance.now()`. Render tree and stage diagram are labelled simplified; forced-layout counts are labelled "counted from the pattern" |
| SC1: Demos react | Met | Table below |
| SC2: < ~1,300 words | Met | ~820 |
| SC3: axe both themes, 360 px | Met | Only the moderate `region` finding from the sidebar shell remains (as in 018 and 019). A serious `scrollable-region-focusable` on the code blocks was fixed. `scrollWidth` is 360 in both themes with every demo showing results |

## SC1 demo results

| Demo | Result |
|------|--------|
| Parsing | `display: none` → the node is in the DOM tree, not in the render tree. `visibility: hidden` → marked "takes space, not painted". `<p>One<p>Two` + a table → two sibling `p`s; `html`, `head`, `body`, `tbody` marked "added by the parser". `::before` is shown only in the render tree. `display: contents` → its `li`s move up to `body`. Editing the CSS updates the trees within 0.5 s. A sample `<script>` is blocked by the sandbox. Empty HTML → "Nothing to render" |
| Script loading | Slowest setup: stylesheet arrived at 1,532 ms and first paint at 1,562 ms; the inline script and both classic head scripts ran at 1,533 ms without the article. Both defer: parser done at 13 ms, first paint at 154 ms, A and B ran at 1,222 ms in document order, before DOMContentLoaded at 1,223 ms. Both async: B ran at 420 ms, then A at 1,217 ms (arrival order). End of body: painted at 156 ms, before the scripts ran. A new run started mid-run leaves one iframe and the new run's timeline. With the tab hidden during a run, the "unreliable" warning is shown |
| Pipeline | Stages: left and width → all four; background-color and box-shadow → no layout; transform and opacity → style and composite only. Meter: 120 fps idle, 34 fps with a 159 ms longest frame when busy. Screencast while busy: the `left` box stayed put in 25 of 39 frame transitions, while the `transform` reference moved in all 39. Pause leaves 0 animations. Reduced motion: 0 animations on load, and the note is shown |
| Thrashing | 100: 9.4 vs 0.9 ms. 500: 58.9 vs 2.5 ms. 2,000: 685 vs 9.0 ms (77× faster batched). Forced layouts N vs 1 |

## Known minor issues (not blocking)

- Paint Timing inside the iframe was checked in Chrome only; other browsers fall back to "not reported by this browser".
- At 2,000 elements the interleaved run blocks the page for about 0.7 s once, which is the point of the demo.
- The parsing demo prints the browser's "Blocked script execution" console message for sample scripts; it is expected.
