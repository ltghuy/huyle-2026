---
id: "020"
feature: rendering-pipeline
created: 2026-10-09
---

# Tasks: How the Browser Renders a Page

## Summary

Total: 9 | Completed: 9 | Remaining: 0

## Execution Plan

```
T001 --┬--> T002 --> T003 ----------┐
       ├--> T004 --> T005 ----------┤
       ├--> T006 (pipeline) --------┼--> T008 --> T009
       └--> T007 (thrash) ----------┘
```

T002–T007 branch off the page shell (T001) and can be dispatched in
parallel: parsing (T002→T003), script loading (T004→T005), pipeline (T006)
and thrashing (T007) touch separate files. T008 writes the topics around
the finished demos; T009 verifies and audits.

## Quality Gates

Run after each task or batch:

- pnpm lint
- pnpm typecheck
- pnpm build (after each commit group and at the end)

## Tasks

### Page shell

- [x] T001 Add the `rendering` catalog entry, the page route, and a content skeleton (intro, TOC, four topic placeholders using `Topic`)
  - **Done when:** `/browser-platform/rendering` renders with breadcrumbs, title and TOC; sidebar, section page and home card show Browser & Web Platform as 3 of 3 written. -- VERIFIED

### Parsing demo

- [x] T002 [B:T001] Implement the tree model: DOM tree (with nodes the parser added), render tree (display none left out, visibility hidden marked, display contents, `::before`/`::after` boxes, non-whitespace text), and matched rules + computed display/visibility for a node
  - **Done when:** in the browser console on a test iframe, `<p>one<p>two` yields two `p` siblings inside an added `body`; a `display:none` node is absent from the render tree but present in the DOM tree; `visibility:hidden` is marked; a `::before` with content appears only in the render tree. -- VERIFIED

- [x] T003 [B:T002] Build ParsingDemo: presets, HTML/CSS textareas, script-less sandboxed preview (300 ms debounce, read on `load`), side-by-side DOM and render trees, selectable node details, "simplified" label, empty-document message
  - **Done when:** editing CSS to `display:none` updates the render tree within half a second; scripts in the sample don't run; an empty HTML box shows "nothing to render" without errors. -- VERIFIED

### Script-loading demo

- [x] T004 [P] [B:T001] Add the render-lab schema, service and routes: sample page HTML built from the setup (logger first in head, stylesheet, inline script, scripts A/B per mode with `onerror`, body content, `load` report via `postMessage`), slow assets with capped delay, `no-store`, 422 on bad params; plus the `explain()` model and presets in `loading.ts`
  - **Done when:** curl shows the page HTML for each mode (attributes and positions correct), an asset arrives after its delay, bad params return 422; a node script prints the expected explanations for slow CSS + inline, classic head, defer order and async arrival order. -- VERIFIED

- [x] T005 [B:T004] Build LoadingDemo: setup controls (stylesheet none/fast/slow, mode per script, inline toggle, slowest-setup preset), iframe remounted per run, run id filtering, 10 s timeout, hidden-tab flag, timeline bars (arrivals, script runs with "saw content", parser end, DCL, load, first paint or "not reported"), explanation
  - **Done when:** in the browser, classic head A paints after A arrives while defer A paints first and runs before DCL; two async scripts run B then A; starting a run mid-run shows only the new run; Paint Timing inside the iframe checked in Chrome and recorded (and Firefox/Safari if available). -- VERIFIED

### Pipeline demo

- [x] T006 [P] [B:T001] Build the stages model and PipelineDemo: property picker (left/top, width, background color, box shadow, transform, opacity), stage diagram labelled simplified, play/pause (no autoplay; reduced-motion note), transform reference box, busy main thread toggle (150 ms of every 200 ms), main-thread meter (fps, longest frame) with the compositor explanation and devtools pointer
  - **Done when:** each property lights the right stages; with busy on, the meter drops for every property and the left box visibly freezes while the reference box keeps moving; pause and unmount stop the animation, rAF loop and busy interval. -- VERIFIED

### Thrash demo

- [x] T007 [P] [B:T001] Build ThrashDemo: element count (100 / 500 / 2,000), run both modes on real elements with widths reset between them, measured times side by side, forced layouts per pattern (labelled counted from the pattern), the two code snippets
  - **Done when:** at 500 elements batched is faster than interleaved in Chrome, forced layouts read 500 vs 1, and the page stays responsive at 2,000. -- VERIFIED

### Content and links

- [x] T008 [B:T003,T005,T006,T007] Write the four topics (intro, ≤ ~6 points, Do/Avoid, links to MDN / web.dev / vendor docs), the page intro linking Networking, and the link from the Performance critical-path topic
  - **Done when:** prose outside the demos is under ~1,300 words; every reference URL returns 200; the Performance link opens the new page. -- VERIFIED

### Verify and audit

- [x] T009 [B:T008] Verify every AC and success criterion in the browser (Puppeteer script, axe in light and dark, 360 px), update knowledge.md, write audit.md, set status `done`
  - **Done when:** all ACs `[x]` with evidence, 0 serious/critical axe issues in both themes, no sideways scroll at 360 px, audit passed. -- VERIFIED

## Requirements Coverage

| Requirement | Tasks |
| ----------- | ----- |
| AC-001 | T001, T008 |
| AC-002 | T002, T003 |
| AC-003 | T002, T003 |
| AC-004 | T004, T005 |
| AC-005 | T004, T005 |
| AC-006 | T006 |
| AC-007 | T006 |
| AC-008 | T007 |
| AC-009 | T008 |
