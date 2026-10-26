---
id: "046"
feature: seo-at-scale
created: 2026-10-22
---

# Tasks: SEO, SEO at scale

## Summary

Total: 5 | Completed: 5 | Remaining: 0

## Execution Plan

```
T001 --> T002 --┬--> T003 [P] --┐
                └--> T004 [P] --┴--> T005
```

## Quality Gates

- pnpm lint
- pnpm typecheck
- pnpm build
- pnpm test:e2e

## Tasks

- [x] T001 SEO spec in the end-to-end suite
  - **Done when:** the spec passes, and fails with the URL named when one canonical is broken

- [x] T002 [B:T001] Page route, content, catalog and README; Crawling rules demo row
  - **Done when:** `/seo/seo-at-scale` renders five topics; the Crawling demo shows the lab page's header

- [x] T003 [P] [B:T002] hreflang and migration demos
  - **Done when:** the samples report the expected findings; the live redirects resolve to /react-practices

- [x] T004 [P] [B:T002] Facets, cases and monitoring demos
  - **Done when:** an empty combination shows 404; sorting works by keyboard; the SEO tests show with outcomes

- [x] T005 [B:T003,T004] Full suite run recorded, verify and audit
  - **Done when:** every check in the design passes

## Requirements Coverage

| Requirement | Tasks |
| ----------- | ----- |
| AC-001, AC-002 | T001 |
| AC-003 | T005 |
| AC-004, AC-006, AC-008, AC-010, AC-012, AC-014 | T002 |
| AC-005, AC-007 | T003 |
| AC-009, AC-011, AC-013 | T004 |
