---
id: "042"
feature: seo-crawling-indexing
created: 2026-10-22
---

# Tasks: SEO, Crawling and indexing control

## Summary

Total: 7 | Completed: 7 | Remaining: 0

## Execution Plan

```
T001 --> T002 --┬--> T003 [P] --┐
                ├--> T004 [P] --┤
                ├--> T005 [P] --┼--> T007
                └--> T006 [P] --┘
```

## Quality Gates

- pnpm lint
- pnpm typecheck
- pnpm build

## Tasks

### The site's setup

- [x] T001 Add `SITE_URL`, robots.ts, sitemap.ts, `metadataBase`, canonical URLs on every route, `noindex` on placeholders, and the API header
  - **Done when:** the `curl` checks in the design pass

### The page

- [x] T002 [B:T001] Page route, content with the five topics' text, advice and links; mark the page written; update How search works text
  - **Done when:** `/seo/crawling-indexing` renders five topics

- [x] T003 [P] [B:T002] robots.txt model and tester with the live file
  - **Done when:** the tester checks in the design pass

- [x] T004 [P] [B:T002] Sitemap view and audit
  - **Done when:** the audit reports zero problems

- [x] T005 [P] [B:T002] Robots rules builder and site check, canonical check
  - **Done when:** the rules and canonical checks pass

- [x] T006 [P] [B:T002] Status code exercise
  - **Done when:** every situation reveals its answer and the summary shows

### Verify

- [x] T007 [B:T003,T004,T005,T006] Full verify and audit
  - **Done when:** every check in the design passes

## Requirements Coverage

| Requirement | Tasks |
| ----------- | ----- |
| AC-001 to AC-005 | T001 |
| AC-006, AC-007 | T002, T003 |
| AC-008, AC-009 | T002, T004 |
| AC-010 to AC-013 | T002, T005 |
| AC-014, AC-015 | T002, T006 |
| AC-016 | T002 |
