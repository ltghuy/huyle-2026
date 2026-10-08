---
id: "016"
feature: performance-handbook
type: brownfield
scope: large
status: done
branch: main
created: 2026-10-08
---

# Feature: Performance Handbook

## Overview

The handbook's "Performance & Accessibility" section is still marked coming
soon, so there's nowhere to learn web performance beyond practice 14. This
feature opens the section as a folder and adds its first page, **Performance**:
a short handbook based on web.dev's *Learn Performance* course. It covers every
module of the course, but only its main concepts and what matters most (why
speed matters and how it's measured, HTML delivery and CDNs, the critical path
and resource hints, images and video, web fonts, code splitting, lazy loading
and prefetching, long tasks and web workers), and shows each topic with a
small live demonstration instead of long text. An **Accessibility**
page is listed in the folder as coming soon.

## Goals

- [x] The Performance handbook can be opened in one click from the sidebar, the home page and the section page.
- [x] Each of the seven topics fits on one screen of reading (key ideas + a few short points) and has a demo whose result changes visibly when the learner flips the setting it teaches.
- [x] Every module of web.dev *Learn Performance* is covered by at least its main points, and links to that module.
- [x] Every number a demo shows as "measured" comes from the learner's own browser; anything modelled is labelled as simulated.

## Out of Scope

| Feature | Reason |
|---------|--------|
| The Accessibility page's content | Listed as coming soon; its own later feature |
| Each web.dev module in full depth | The user asked for main concepts; each module gets its key points, and the page links to it |
| Lab tools inside the page (Lighthouse runs, network throttling) | The browser's own tools do this; the page links to them |
| Browser & Web Platform and Frontend System Design sections | Still coming soon |

## User Stories

### P1: Reach the section and the Performance page

- As a learner, I want Performance & Accessibility to be a folder with a Performance page so that I can find the performance notes next to the practices.
- **Why P1:** Nothing else is reachable without it.
- **Independent Test:** Open the section and the Performance page from the sidebar and the home page; refresh each address.

**Acceptance Criteria:**

- [x] AC-001: WHEN the sidebar is shown THEN system SHALL show Performance & Accessibility as a folder (not marked coming soon) listing Performance and Accessibility (Accessibility marked coming soon); the folder SHALL be open whenever one of its pages is shown, the current page SHALL be marked, and the sidebar filter SHALL match these page titles too.
- [x] AC-002: WHEN the user opens the section's address THEN system SHALL show its title, summary and a card per page (title, one-line summary, status) linking to each page; WHEN the home page is shown THEN the section's card SHALL link there and show how many of its pages are written.
- [x] AC-003: WHEN the Performance page is opened directly or refreshed THEN system SHALL show breadcrumbs (Handbook › Performance & Accessibility › Performance), the title, a one-paragraph intro, a list of its topics that jumps to each, and a credit linking to web.dev's *Learn Performance*; the Accessibility address SHALL show a coming-soon placeholder.

### P1: Why speed matters, measured live

- As a learner, I want to see the Core Web Vitals of the page I'm on so that the metrics stop being abstract.
- **Why P1:** Every later topic is judged by these metrics.
- **Independent Test:** Open the page, click and scroll, and watch the values and ratings fill in.

**Acceptance Criteria:**

- [x] AC-004: WHEN the Performance page loads THEN system SHALL show this page's own TTFB, FCP, LCP, CLS and INP as they become available, each with its "good" threshold and a rating (good / needs improvement / poor) shown by text, not color alone; a metric not yet available (INP before any interaction) SHALL say what triggers it.
- [x] AC-005: WHEN the browser can't report a metric THEN system SHALL say it isn't supported in this browser instead of showing zero.

### P1: Critical path and resource loading

- As a learner, I want to toggle loading techniques and see when the page would first paint so that I understand render blocking and resource hints.

**Acceptance Criteria:**

- [x] AC-006: WHEN the critical-path demo is shown THEN system SHALL draw a simulated request waterfall for a sample page (HTML, stylesheet, script, web font, hero image) with markers for first paint and largest paint, labelled as simulated.
- [x] AC-007: WHEN the learner toggles defer the script, inline critical CSS, preload the hero image, preconnect to the font origin, or `fetchpriority="high"` on the hero image THEN the waterfall and both markers SHALL update immediately, with a one-line reason for each change; a preset SHALL reset everything to the unoptimized page.

### P1: HTML delivery and CDNs

- As a learner, I want to see what a CDN, edge caching, compression and a redirect each do to the time until the HTML arrives so that I understand server response time.

**Acceptance Criteria:**

- [x] AC-015: WHEN the HTML-delivery demo is shown THEN system SHALL show a simulated breakdown of one HTML request (DNS, connection, redirect, server time, download) for a visitor far from the server, with TTFB and "HTML downloaded" totals, labelled as simulated.
- [x] AC-016: WHEN the learner toggles serving from a CDN, caching the HTML at the edge, compressing with Brotli, or removing a redirect THEN the breakdown and totals SHALL update immediately, each switch stating what it saves.

### P2: Images and layout shift

- As a learner, I want to see an image push content down when its space isn't reserved, and not when it is, so that I understand CLS and image sizing.

**Acceptance Criteria:**

- [x] AC-008: WHEN the learner loads the sample article with the image's size reserved off THEN the text below SHALL jump when the image arrives and the demo SHALL show the layout shift score measured by the browser; with it on, the score SHALL stay 0.
- [x] AC-009: WHEN the demo is shown THEN system SHALL also show, for the same image, which file a responsive image would pick at the current width and how many bytes that saves over the largest one, and lazy loading SHALL be explained in one line with a link to practice 11.

### P2: Web fonts

- As a learner, I want to see what text looks like while a web font loads under each `font-display` value so that I can choose one.

**Acceptance Criteria:**

- [x] AC-017: WHEN the learner plays the font demo with a chosen font arrival time THEN system SHALL show the same text under block, swap and optional side by side as the time passes (invisible, fallback font or web font), state each one's current status in words, and label the demo as simulated.

### P2: Code splitting and prefetching

- As a learner, I want to load a heavy feature only when needed, and start loading it early on intent, so that I understand code splitting.

**Acceptance Criteria:**

- [x] AC-010: WHEN the learner opens the heavy feature THEN system SHALL load its code only at that moment and show how long it took and its transferred size from the browser's resource timing; WHEN it was already loaded THEN system SHALL say it came from memory.
- [x] AC-011: WHEN prefetch on hover/focus is on THEN system SHALL start loading as the pointer enters or focus reaches the button, and the demo SHALL show how much of the wait that saved; the learner SHALL be able to reset and load it cold again (the browser keeps the real file cached, and the demo says so).

### P2: Long tasks and web workers

- As a learner, I want to run the same heavy computation (blurring a photo) three ways and watch an animation and an input stay responsive or freeze so that I understand long tasks, yielding and workers, with a realistic use case.

**Acceptance Criteria:**

- [x] AC-012: WHEN the learner runs the work (blurring an image) on the main thread in one go, in chunks that yield, or in a web worker THEN system SHALL show the blurred image, and per run the total time, the longest blocking task and the frames dropped, keep the last result of each mode side by side, and give an identical image in all three (same checksum); the worker SHALL receive and return the pixels without copying them.
- [x] AC-013: WHEN a run is in progress THEN a moving indicator driven by the main thread SHALL visibly freeze in one-go mode and keep moving in the other two, and the learner SHALL be able to type in a box during the run.

### P3: Short notes

**Acceptance Criteria:**

- [x] AC-014: WHEN a topic is shown THEN system SHALL show at most about six key points and a "Do / Avoid" pair or two, with links to the matching web.dev modules.
- [x] AC-018: WHEN the page is read THEN its notes SHALL cover, besides the topics above: redirects, HTML caching, compression and CDNs; `dns-prefetch`; video (poster, preload, video instead of GIFs, lazy video); lazy-loading `<iframe>`s and embed facades; Speculation Rules prefetch and prerender and service worker precaching.

## Edge Cases

- WHEN the browser has no web worker or long-task support THEN the long-task demo SHALL still run the other modes and say which numbers aren't available.
- WHEN the learner starts a run while one is in progress THEN system SHALL not start a second one (the run button is disabled until it finishes).
- WHEN the user prefers reduced motion THEN demos SHALL not animate decoratively, and the long-task indicator SHALL show progress as a changing number instead of motion.
- WHEN the screen is 360 px wide THEN no page in the section SHALL scroll sideways (the waterfall scrolls in its own box or shrinks).
- WHEN an unknown address under the section is opened THEN system SHALL show the not-found page.

## Success Criteria

- [x] All seven demos react to their controls: the HTML-delivery TTFB drops with each switch on; the font demo shows invisible text only under block; the critical-path markers move earlier with every optimization on; layout shift is above 0 with the size unreserved and 0 reserved; the prefetched load waits less than the cold one; the one-go blur drops frames while the worker run drops almost none.
- [x] The whole page reads in about twelve minutes (under ~1,800 words of prose outside the demos).
- [x] 0 serious/critical axe issues on the section page and the Performance page in light and dark themes; no sideways scroll at 360 px.

## Open Questions

- None. Defaults chosen without asking are in decisions.md.

## Notes

Source: web.dev *Learn Performance*, all 14 modules (welcome, why speed
matters, general HTML performance, critical path, resource loading, resource
hints, images, video, fonts, code splitting, lazy loading images and iframes,
prefetching and prerendering, web workers overview, a concrete web worker use
case). Seven topics group them: (1) why speed matters; (2) HTML delivery and
CDNs; (3) critical path, resource loading and hints; (4) images, video and lazy
loading; (5) web fonts; (6) code splitting, prefetching and prerendering;
(7) long tasks and web workers, with an image-processing worker as the
concrete use case (as in the course).

Core Web Vitals thresholds ("good" at the 75th percentile): LCP ≤ 2.5 s, INP ≤
200 ms, CLS ≤ 0.1; also FCP ≤ 1.8 s and TTFB ≤ 0.8 s.

## Baseline

### Current Behavior

- The sidebar and home page list Performance & Accessibility as "coming soon"; it has no address and isn't a link.

### Gaps / Limitations

- No performance notes outside practice 14, which only covers rendering large lists in React.
