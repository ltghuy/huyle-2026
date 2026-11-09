---
id: 038
feature: admin
created: 2026-11-09
---

# Tasks: Admin page

## Summary

Total: 9 | Completed: 9 | Remaining: 0

## Execution Plan

```
T001 --> T002 --> T003 --> T004 --> T005
                  T003 --> T006
                  T004, T006 --> T007 --> T008 --> T009
```

## Quality Gates

- pnpm --filter learn-english lint
- pnpm --filter learn-english typecheck
- pnpm --filter learn-english test

## Tasks

- [x] T001 Migration 0010, schema columns, Better Auth `isAdmin` field
  - **Done when:** migration applies locally; typecheck passes
- [x] T002 [B:T001] `requireAdmin` and admin schemas
  - **Done when:** unit tests: guest 401, non-admin 403, admin passes
- [x] T003 [B:T002] Overview service + route
  - **Done when:** service tests on seeded SQLite cover every number in AC-006 to AC-008
- [x] T004 [B:T002] Content service + routes (list, get, save, remove/restore)
  - **Done when:** tests cover validation, version bump, tombstone, read-only kinds, duplicate id
- [x] T005 [B:T004] `content:pull` script and publish guard
  - **Done when:** tests cover file placement, removal, clearing the mark, publish refusing
- [x] T006 [B:T002] Claims service + routes
  - **Done when:** tests cover grouping, approve (new and existing wording, duplicate), reject, drop, already decided
- [x] T007 [B:T003,T004,T006] Admin client, page shell, gate, sidebar link
  - **Done when:** guest / non-admin / admin views tested
- [x] T008 [B:T007] Tabs: overview, claims, content editor
  - **Done when:** component tests for each tab's main flow
- [x] T009 [B:T008] Browser check on the dev server, gates, build, knowledge
  - **Done when:** all three tabs work against local D1

## Requirements Coverage

| Requirement | Tasks |
| ----------- | ----- |
| AC-001 | T001 |
| AC-002, AC-004, AC-005 | T007 |
| AC-003 | T002 |
| AC-006 to AC-008 | T003, T008 |
| AC-009 to AC-012 | T006, T008 |
| AC-013 to AC-017 | T004, T008 |
| AC-018, AC-019 | T005 |
