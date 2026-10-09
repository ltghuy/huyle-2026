---
id: "018"
feature: networking-handbook
created: 2026-10-08
---

# Tasks: Networking Handbook

## Summary

Total: 6 | Completed: 6 | Remaining: 0

## Execution Plan

```
T001 --┬--> T002 --┐
       ├--> T003 --┼--> T005 --> T006
       └--> T004 --┘
```

## Quality Gates

- pnpm lint
- pnpm typecheck
- pnpm build (after T001 and at the end)

## Tasks

- [x] T001 Generalize topic pages (catalog, SectionIndex, TopicFrame, sidebar), open Browser & Web Platform with the Networking route shell
  - **Done when:** both section pages and all three topic pages render; counts correct; Performance/Accessibility unchanged; build passes. -- VERIFIED

- [x] T002 [P] [B:T001] Models and demos: journey, slow start, versions (+ real protocols)
  - **Done when:** Node script shows TLS 1.3 / reuse / HTTP/3 cut round trips, loss adds rounds, H2 loss stalls all files and H3 one. -- VERIFIED

- [x] T003 [P] [B:T001] Echo + cache services and routes
  - **Done when:** curl shows each status with its headers, 301 redirect, 304 on matching ETag, log entries per run. -- VERIFIED

- [x] T004 [P] [B:T001] HttpDemo, CacheDemo, HttpsDemo
  - **Done when:** in the browser a chosen status comes back; max-age second fetch not counted by the server; ETag second fetch logged as 304; no-store always 200. -- VERIFIED

- [x] T005 [B:T002,T003,T004] Content: six topics, notes, Do/Avoid, links; wire demos
  - **Done when:** prose under ~1,600 words; every topic has a demo and links. -- VERIFIED

- [x] T006 [B:T005] Verify ACs (browser, axe both themes, 360 px), knowledge, audit
  - **Done when:** ACs `[x]`, audit.md written, status `done`. -- VERIFIED

## Requirements Coverage

| Requirement | Tasks |
| ----------- | ----- |
| AC-001, AC-002 | T001 |
| AC-003, AC-004, AC-007, AC-008 | T002 |
| AC-005, AC-006 | T003, T004 |
| AC-009, AC-010 | T004 |
| AC-011 | T005 |
