---
id: "016"
feature: performance-handbook
created: 2026-10-08
---

# Tasks: Performance Handbook

## Summary

Total: 12 | Completed: 12 | Remaining: 0

## Execution Plan

```
T001 --> T002 --┐
T003 -----------┼--> T006 --> T007
T004 -----------┤
T005 -----------┘
```

## Quality Gates

Run after each task or batch:

- pnpm lint
- pnpm typecheck
- pnpm build (after T002 and at the end)

## Tasks

### Section shell

- [x] T001 Extend the catalog (section href, pages, progress helper) and make the sidebar folders generic
  - **Done when:** the sidebar shows both folders, filter matches pages in both, typecheck passes. -- VERIFIED

- [x] T002 [B:T001] Home card progress, TopicFrame, section page, Accessibility placeholder, Performance route shell
  - **Done when:** `/performance-accessibility`, `/…/performance`, `/…/accessibility` render; unknown slug 404s; build passes. -- VERIFIED

### Demos

- [x] T003 [P] Vitals meter (observers, thresholds, ratings, unsupported states)
  - **Done when:** values and ratings appear on load; INP appears after a click. -- VERIFIED

- [x] T004 [P] Critical-path model + demo, and layout-shift demo
  - **Done when:** a scratch script shows each option moves a marker earlier; layout shift > 0 unreserved, 0 reserved in the browser. -- VERIFIED (the model check was run as "removing any one technique from the all-on set makes FCP, LCP or the font later"; inline critical CSS alone gains nothing while the script still blocks, which the demo explains)

- [x] T005 [P] Code-splitting demo (+ heavy report) and long-task demo (+ primes, worker)
  - **Done when:** the chunk loads only on demand with size and time; three modes give the same count, one-go drops frames. -- VERIFIED

### Content and verification

- [x] T006 [B:T002,T003,T004,T005] Write the handbook content (intro, TOC, five topics, DoAvoid, web.dev links) and wire the demos
  - **Done when:** the page reads in order, every topic has a demo and a source link, prose under ~1,500 words. -- VERIFIED

- [x] T007 [B:T006] Verify all ACs (browser, axe both themes, 360 px), record knowledge, audit
  - **Done when:** ACs marked `[x]`, audit.md written, status `done`. -- VERIFIED

### Full course coverage (D5)

- [x] T008 [P] HTML delivery model + demo (CDN, edge cache, Brotli, redirect)
  - **Done when:** a scratch script shows every switch lowers TTFB or download time; the demo updates in the browser. -- VERIFIED

- [x] T009 [P] Font-display demo (block / swap / optional on one clock, arrival-time choice)
  - **Done when:** only block shows invisible text; optional keeps the fallback when the font is late; swap switches at arrival. -- VERIFIED

- [x] T010 [P] Replace prime counting with an image blur (shared blur functions, transferable worker, result image, checksum)
  - **Done when:** all three modes give the same checksum and image; one go drops frames, worker doesn't. -- VERIFIED

- [x] T011 [B:T008,T009,T010] Restructure the content into seven topics; add CDN/HTML, dns-prefetch, video, iframe/facade, Speculation Rules, service worker notes; links to every module
  - **Done when:** every one of the 14 modules is linked and has its main points; prose under ~1,800 words. -- VERIFIED

- [x] T012 [B:T011] Re-verify (gates, browser, axe both themes, 360 px), update knowledge, re-audit
  - **Done when:** ACs marked, audit updated, status `done`. -- VERIFIED

## Requirements Coverage

| Requirement | Tasks |
| ----------- | ----- |
| AC-001 | T001 |
| AC-002, AC-003 | T002, T006 |
| AC-004, AC-005 | T003 |
| AC-006–AC-009 | T004 |
| AC-010–AC-013 | T005 |
| AC-014 | T006, T011 |
| AC-012 (blur) | T010 |
| AC-015, AC-016 | T008 |
| AC-017 | T009 |
| AC-018 | T011 |
