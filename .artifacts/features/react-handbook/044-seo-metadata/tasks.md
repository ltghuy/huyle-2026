---
id: "044"
feature: seo-metadata
created: 2026-10-22
---

# Tasks: SEO, Metadata and structured data

## Summary

Total: 6 | Completed: 6 | Remaining: 0

## Execution Plan

```
T001 --> T002 --> T003 --┬--> T004 [P] --┐
                         └--> T005 [P] --┴--> T006
```

## Quality Gates

- pnpm lint
- pnpm typecheck
- pnpm build

## Tasks

- [x] T001 `pageMetadata()` and Open Graph and X tags on every indexable page
  - **Done when:** a topic page's HTML has every AC-001 tag

- [x] T002 [B:T001] Card list, card layout and the `/og/[kind]/[slug]` route
  - **Done when:** card URLs return 1200 × 630 PNGs; an unknown card is 404

- [x] T003 [B:T002] JSON-LD components on handbook pages, section pages and home; page route and content; mark written
  - **Done when:** handbook pages carry both blocks; `/seo/metadata-structured-data` renders five topics

- [x] T004 [P] [B:T003] SERP preview, social card preview and card image demos
  - **Done when:** each demo shows live data and its checks

- [x] T005 [P] [B:T003] Structured data rules, JSON-LD inspector and editor
  - **Done when:** this site's blocks pass; samples report the expected notes

- [x] T006 [B:T004,T005] Full verify and audit
  - **Done when:** every check in the design passes

## Requirements Coverage

| Requirement | Tasks |
| ----------- | ----- |
| AC-001 | T001 |
| AC-002 | T002 |
| AC-003 | T003 |
| AC-004 to AC-009 | T003, T004 |
| AC-010 to AC-013 | T003, T005 |
| AC-014 | T003 |
