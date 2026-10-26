---
id: "041"
feature: seo-section
created: 2026-10-22
---

# Tasks: SEO section + "How search works"

## Summary

Total: 8 | Completed: 8 | Remaining: 0

## Execution Plan

```
T001 --> T002 --> T003 --┬--> T004 [P] --┐
                         ├--> T005 [P] --┤
                         ├--> T006 [P] --┼--> T008
                         └--> T007 [P] --┘
```

## Quality Gates

Run after each task or batch:

- pnpm lint
- pnpm typecheck
- pnpm build

## Tasks

### Section wiring

- [x] T001 Add the `seo` section, its six pages with levels, the icon, the sidebar folder, home copy, references and README row
  - **Done when:** the sidebar, page search and home page list SEO with 1 of 6 pages written; typecheck passes

- [x] T002 [B:T001] Add the section route with level badges and the fallback route for unwritten pages
  - **Done when:** `/seo` lists six cards with levels; `/seo/ai-search` shows the "being written" note; `/seo/nope` is a 404

### The page

- [x] T003 [B:T002] Add the page route, content with intro, skill map, Toc and the five topics' text, advice and links (demos stubbed)
  - **Done when:** `/seo/how-search-works` renders breadcrumbs, dates, skill map, topic list and five topics

- [x] T004 [P] [B:T003] Pipeline model and demo
  - **Done when:** the pipeline checks in the design pass in the browser

- [x] T005 [P] [B:T003] Crawl model and demo
  - **Done when:** the crawl checks in the design pass in the browser

- [x] T006 [P] [B:T003] Crawler view
  - **Done when:** the crawler-view checks in the design pass in the browser

- [x] T007 [P] [B:T003] Canonical model and demo, claims and sorter
  - **Done when:** the canonical and claims checks pass in the browser

### Verify

- [x] T008 [B:T004,T005,T006,T007] Full verify: axe in both themes, 360 px, keyboard, quality gates
  - **Done when:** every check in the design's test strategy passes

## Requirements Coverage

| Requirement | Tasks |
| ----------- | ----- |
| AC-001 | T001 |
| AC-002 | T001, T002 |
| AC-003 | T003 |
| AC-004 | T003 |
| AC-005 | T004 |
| AC-006, AC-007 | T005 |
| AC-008, AC-009 | T006 |
| AC-010 | T003 |
| AC-011 | T007 |
| AC-012 | T003 |
| AC-013 | T007 |
| AC-014 | T003 |
| AC-015 | T003 |
