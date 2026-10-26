---
id: "019"
feature: origins-and-cors
created: 2026-10-08
---

# Tasks: Origins, DNS and CORS

## Summary

Total: 5 | Completed: 5 | Remaining: 0

## Execution Plan

```
T001 --┬--> T002 --┐
       └--> T003 --┼--> T004 --> T005
```

## Quality Gates

- pnpm lint
- pnpm typecheck
- pnpm build (at the end)

## Tasks

- [x] T001 Catalog entry, route shell, url-parts and cors-rules models
  - **Done when:** Node script shows the URL split, site and origin comparisons, and preflight/explain cases as expected. -- VERIFIED

- [x] T002 [P] [B:T001] DNS and CORS-lab services and routes
  - **Done when:** curl shows records with TTL, not-found, preflight headers per policy, and log entries. -- VERIFIED

- [x] T003 [P] [B:T001] UrlDemo, DnsDemo, OriginDemo, CorsDemo
  - **Done when:** each reacts in the browser; CORS blocked request appears in the server log. -- VERIFIED

- [x] T004 [B:T002,T003] Content (four topics) + link from Networking
  - **Done when:** prose under ~1,300 words; links resolve. -- VERIFIED

- [x] T005 [B:T004] Verify ACs (browser, axe both themes, 360 px), knowledge, audit
  - **Done when:** ACs `[x]`, audit written, status `done`. -- VERIFIED

## Requirements Coverage

| Requirement | Tasks |
| ----------- | ----- |
| AC-001 | T001, T004 |
| AC-002, AC-005 | T001, T003 |
| AC-003, AC-004 | T002, T003 |
| AC-006, AC-007 | T001–T003 |
| AC-008 | T004 |
