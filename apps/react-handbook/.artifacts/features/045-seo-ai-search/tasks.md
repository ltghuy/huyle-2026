---
id: "045"
feature: seo-ai-search
created: 2026-10-22
---

# Tasks: SEO, SEO for AI search and LLMs

## Summary

Total: 6 | Completed: 6 | Remaining: 0

## Execution Plan

```
T001 --> T002 --┬--> T003 [P] --┐
                ├--> T004 [P] --┼--> T006
                └--> T005 [P] --┘
```

## Quality Gates

- pnpm lint
- pnpm typecheck
- pnpm build

## Tasks

- [x] T001 Bot list, `robots.ts` groups and the `/llms.txt` route
  - **Done when:** the AC-001 verdicts and the llms.txt/sitemap comparison pass by script

- [x] T002 [B:T001] Page route, content for five topics, catalog and README marked written
  - **Done when:** `/seo/ai-search` renders five topics and is in the sitemap and llms.txt

- [x] T003 [P] [B:T002] Bot tester and controls demos
  - **Done when:** this site's file shows GPTBot blocked and OAI-SearchBot allowed; the "in answers, out of training" goal shows the right lines per vendor

- [x] T004 [P] [B:T002] Answer model demo
  - **Done when:** `nosnippet` drops a page from the Google answer and the GPTBot toggle changes nothing

- [x] T005 [P] [B:T002] llms.txt checker and access log demos
  - **Done when:** this site's llms.txt passes with every link loading; the sample log flags the fake GPTBot and the disallowed request

- [x] T006 [B:T003,T004,T005] Full verify and audit
  - **Done when:** every check in the design passes

## Requirements Coverage

| Requirement | Tasks |
| ----------- | ----- |
| AC-001, AC-002 | T001 |
| AC-003, AC-005, AC-007, AC-009, AC-011, AC-013 | T002 |
| AC-004, AC-008 | T003 |
| AC-006 | T004 |
| AC-010, AC-012 | T005 |
