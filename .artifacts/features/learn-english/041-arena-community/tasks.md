---
id: 041
feature: arena-community
created: 2026-11-12
---

# Tasks: "Cộng đồng" in the Arena

## Summary

Total: 9 | Completed: 9 | Remaining: 0

## Execution Plan

```
T001 --> T002 --> T004 --> T005
   └---> T003 ---┘    └--> T006
T007 [B:T001] --> T008 [B:T005]
T009 [B:all]
```

## Quality Gates

Run after each task or batch:

- `pnpm --filter learn-english lint`
- `pnpm --filter learn-english typecheck`
- `pnpm --filter learn-english test`

## Tasks

### Rules

- [x] T001 Add the `public` flag and `publish` event to both machines and protocols, cleared when a match starts, and `listingOf` in `src/learning/arena/community.ts`
  - **Done when:** machine and listing tests cover publish rights, clearing at start, and listing per kind/phase/seats

### Server

- [x] T002 [B:T001] Add `arena_community` to the Drizzle schema and `migrations/0012_arena_community.sql`; write `src/server/arena/community.ts` (write, remove, list)
  - **Done when:** service tests on `sqliteDb()` pass (filters, order, cap, cutoff, prune)

- [x] T003 [B:T001] Keep the row in step from `ArenaRoom.apply`
  - **Done when:** room tests show a write on publish, a delete when full or started, nothing when unchanged

- [x] T004 [B:T002] Add `GET /api/arena/community` with `communityQuerySchema` and the response schema
  - **Done when:** route tests for 200, 401, 422 pass

### Client

- [x] T005 [B:T004] Add `fetchCommunity` and `publish()` on both room hooks
  - **Done when:** typecheck passes and hook tests (if the hooks have send tests) cover the frame

- [x] T006 [B:T005] Add the publish control to the duel and team lobbies
  - **Done when:** lobby tests: host-only button, "đang hiện" line, hidden without a free seat

- [x] T007 [B:T001] Add the "Cộng đồng" hub card
  - **Done when:** hub test sees the card linking to `/arena/community`

- [x] T008 [B:T005] Build the community page and list
  - **Done when:** list tests cover AC-007 to AC-014

### Verify

- [x] T009 [B:T001-T008] Gates, local D1 migration, browser check of publish → list → join with two learners
  - **Done when:** gates pass and the flow works on the Cloudflare preview (`next dev` can't run rooms, knowledge.md 023): e2e `arena-community.spec.ts`

## Requirements Coverage

| Requirement | Tasks |
| ----------- | ----- |
| AC-001 | T006 |
| AC-002 | T001, T006 |
| AC-003 | T001, T003 |
| AC-004 | T001, T003 |
| AC-005 | T001, T003 |
| AC-006 | T007 |
| AC-007 | T002, T004, T008 |
| AC-008 | T002, T004, T008 |
| AC-009 | T008 |
| AC-010 | T008 |
| AC-011 | T008 |
| AC-012 | T008 |
| AC-013 | T008 |
| AC-014 | T008 |
