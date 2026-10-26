---
id: "020"
feature: rendering-pipeline
type: brownfield
scope: large
status: done
branch: main
created: 2026-10-09
---

# Feature: How the Browser Renders a Page

## Overview

The Browser & Web Platform section explains how bytes reach the browser
(Networking) and who a request is from (Origins, DNS and CORS), but not what
the browser does with the bytes once they arrive. Learners can name "reflow"
and "render-blocking" without a model of the pipeline behind them, so they
can't predict why a script delays the first paint, why animating `top` is
janky while `transform` is smooth, or why a loop that reads sizes freezes the
page. This feature adds a third Browser & Web Platform page, **How the
browser renders a page**: parsing into the DOM and CSSOM and building the
render tree, what blocks parsing and rendering and how script loading
attributes change it, the layout → paint → composite stages and what each
style change triggers, and layout thrashing. Short notes, each with a live
demo; loading order and timings are measured in the browser, and the
pipeline diagrams are labelled simplified.

## Goals

- [x] The page can be opened in one click from the sidebar, the home page and the section page, and the Performance page's critical-path topic links to it.
- [x] Each of the four topics fits on one screen of reading and has a demo whose result changes with the learner's input.
- [x] Script-loading, animation and layout-thrashing demos show measured results (event order and times the browser reported, real frame times, real elapsed time), with every simplification labelled.

## Out of Scope

| Feature | Reason |
|---------|--------|
| The event loop (tasks, microtasks, animation frames) | Its own page later; this page mentions where rendering happens only in one point |
| Resource hints, preload and the request waterfall | Already covered by the Performance page's critical-path topic; linked instead |
| Browser engine internals beyond the main stages (style invalidation algorithms, GPU rasterization, layer tree details) | Too deep for one screen; links cover them |
| Measuring paint or layout from inside the page with private browser tooling | Not available to page scripts; the demos explain how to see it in the browser's developer tools |

## User Stories

### P1: Reach the page

- As a learner, I want to find the rendering page next to the other Browser & Web Platform pages so that I can study it in order.
- **Why P1:** A page nobody can reach teaches nothing.
- **Independent Test:** Open the home page, the section page and the sidebar; each lists the page as written, and the link opens it.

**Acceptance Criteria:**

- [x] AC-001: WHEN the sidebar, the Browser & Web Platform section page or the home card is shown THEN the new page SHALL be listed as written and counted (3 of 3); the page SHALL show breadcrumbs, title, intro and a topic list; the Performance page's critical-path topic SHALL link to it.

### P1: Parsing, the DOM, the CSSOM and the render tree

- As a learner, I want to edit a small HTML and CSS sample and see the DOM tree, the style rules that apply, and which nodes make it into the render tree, so that "DOM", "CSSOM" and "render tree" stop being the same thing.
- **Why P1:** Every later topic builds on knowing what the render tree is.
- **Independent Test:** Add `display: none` to an element: it stays in the DOM tree but disappears from the render tree; with `visibility: hidden` it stays in both.

**Acceptance Criteria:**

- [x] AC-002: WHEN the learner edits the sample HTML or CSS (or picks a preset) THEN system SHALL show the DOM tree the browser parsed (including elements it added or fixed, such as a missing body or an unclosed tag), and for a selected node the rules that matched it and its computed display and visibility.
- [x] AC-003: WHEN the trees are shown THEN system SHALL show the render tree next to the DOM tree, leaving out nodes that aren't rendered (display none, head content, script) and marking nodes that take up space but aren't painted (visibility hidden); it SHALL be labelled simplified.

### P1: What blocks parsing and rendering

- As a learner, I want to load a real sample page whose stylesheet and scripts arrive slowly, change how each script is loaded, and see when the page could first paint and when its events fired, so that render-blocking, parser-blocking, defer, async and module scripts are concrete.
- **Why P1:** The most common interview and production question on this topic.
- **Independent Test:** With a slow classic script in the head, the content after it appears only after the script arrives; switching it to defer lets the content appear first and the script runs before DOMContentLoaded.

**Acceptance Criteria:**

- [x] AC-004: WHEN the learner loads the sample page with a chosen setup (a slow stylesheet on or off; two scripts with different delays, each loaded as classic in head, classic at end of body, defer, async or module; optional inline script after the stylesheet) THEN system SHALL load it for real from this site and show a timeline of when each resource arrived, when each script ran, when the parser reached the end of the document, and when DOMContentLoaded and load fired, as reported by the browser.
- [x] AC-005: WHEN a run finishes THEN system SHALL say in words what blocked what (the stylesheet blocked rendering and the inline script after it; a classic script blocked the parser; async scripts ran in arrival order; defer and module scripts ran in document order before DOMContentLoaded), and a preset SHALL reset to the slowest setup.

### P1: Layout, paint and composite

- As a learner, I want to animate the same box by changing different properties and see which pipeline stages each change runs and how smooth it really is, so that I know which properties are cheap to animate.
- **Why P1:** Explains jank, the most visible rendering problem.
- **Independent Test:** Animate with left: the stage diagram lights layout, paint and composite; with transform: composite only; with busy main thread on, the left box freezes during each busy chunk while the transform box keeps moving.

**Acceptance Criteria:**

- [x] AC-006: WHEN the learner picks a property to animate (position via left/top, width, background color, box shadow, transform, opacity) THEN system SHALL show which stages it triggers (style, layout, paint, composite), labelled simplified, and the main-thread frame rate and longest frame measured while it runs.
- [x] AC-007: WHEN the learner turns on busy main thread THEN the main thread SHALL be kept busy in chunks while the animation runs, and a transform reference box SHALL animate next to the chosen one so the learner can see which keeps moving; the demo SHALL say that its meter counts main-thread frames (blocked for every property) and that motion drawn by the compositor can't be measured from the page, and point to the browser's developer tools to see it.

### P2: Layout thrashing

- As a learner, I want to resize many elements the slow way and the fast way and compare the real time each takes, so that I can spot forced synchronous layout in code.
- **Why P2:** A key senior skill, but it builds on the layout topic.

**Acceptance Criteria:**

- [x] AC-008: WHEN the learner runs the update with a chosen number of elements in interleaved mode (read a size, write a size, for each element) or batched mode (all reads, then all writes) THEN system SHALL do it for real and show the measured elapsed time for each mode and the number of forced layouts each pattern causes (labelled as counted from the pattern), side by side, with the two code patterns shown.

### P3: Notes

- As a learner, I want each topic to have a short intro, key points, do/avoid pairs and reference links, matching the other handbook pages.
- **Why P3:** Consistency; the demos carry the main value.

**Acceptance Criteria:**

- [x] AC-009: WHEN a topic is shown THEN system SHALL show a short intro, at most about six key points and one or two Do / Avoid pairs with reference links (MDN, web.dev, browser vendor docs).

## Edge Cases

- WHEN the sample HTML is empty or malformed THEN the parsing demo SHALL show what the browser built anyway, without crashing.
- WHEN the learner starts another script-loading run before the last one finished THEN the old run SHALL be dropped and only the new run's timeline shown.
- WHEN the server is slow or unreachable THEN the script-loading demo SHALL show which resource failed and stay usable.
- WHEN the learner prefers reduced motion THEN animations SHALL not start by themselves; they run only after the learner presses play, and the demo says why.
- WHEN the tab is hidden during a run THEN timings SHALL be marked unreliable instead of shown as real.
- WHEN the screen is 360 px wide THEN the page SHALL not scroll sideways.

## Success Criteria

- [x] Demos react: `display: none` removes a node from the render tree but not the DOM; a slow stylesheet delays the first paint and an inline script after it; a slow classic head script delays content after it while defer does not and runs before DOMContentLoaded; two async scripts run in arrival order; the left animation is shown triggering layout and freezes during busy chunks while the transform reference keeps moving; batched mode is faster than interleaved mode for 500 elements and forces one layout instead of hundreds.
- [x] Under ~1,300 words of prose outside the demos.
- [x] 0 serious/critical axe issues in both themes; no sideways scroll at 360 px.

## Open Questions

- None. Topics, real-vs-modelled and event-loop placement confirmed with the user on 2026-10-09. AC-006/007/008 wording narrowed during design to what a page can measure (see design.md Decisions).

## Notes

- Follows the pattern of the Networking and Origins pages: four topics, each with intro, key points, one live demo, Do / Avoid and links.
- The Performance page shows a simulated loading waterfall; this page explains the browser behavior behind it with real loading runs, so they link to each other rather than repeat.

## Baseline

### Current Behavior

- Browser & Web Platform has two pages (Networking; Origins, DNS and CORS). Rendering appears only as the "first paint" marker of the Performance page's simulated waterfall.

### Gaps / Limitations

- Nothing explains the DOM, CSSOM and render tree, what really blocks rendering, which style changes are expensive, or layout thrashing.
