---
id: 007
feature: weekly-leaderboard
created: 2026-10-28
---

# Tasks: Weekly leaderboard after the daily lesson

## Summary

Total: 6 | Completed: 6 | Remaining: 0

## Execution Plan

```
T001 --> T002 --> T004 --> T005 --> T006
T003 -------------┘
```

## Quality Gates

Run after each task or batch:

- `pnpm --filter learn-english lint`
- `pnpm --filter learn-english typecheck`
- `pnpm --filter learn-english test`

## Tasks

### Rules

- [x] T001 Write `src/learning/leaderboard.ts`: `weekKey`, `weekPoints`, `checkBoardName` with the blocklist, `slideOffsets`; with tests
  - **Done when:** tests cover ISO weeks across a year change, weekly points before and after today, rejected and accepted names, slide offsets for moved up, unchanged and tied

### Server

- [x] T002 [B:T001] Add `leaderboard_entries` to the Drizzle schema and generate the migration; write the schema, service (guarded upsert, ranks and neighbours in one batch, cleanup, delete) and route with the `LEADERBOARD_LIMITER` binding; with tests
  - **Done when:** service and route tests pass for join, update, wrong secret (403), bad name (422), limits (422), throttle (429), delete (204); `pnpm cf:typegen` lists the binding

### Profile

- [x] T003 Add `leaderboard` to the profile, the snapshot schema and the merge; with tests
  - **Done when:** a backup and a sync merge keep the field (last change wins)

### Client

- [x] T004 [B:T002,T003] Write `src/lib/leaderboard-client.ts` (join, submit the week, leave) and the consent dialog and animated board after the daily lesson; with tests
  - **Done when:** consent shows once after an awarded lesson; joined learners see the board with the moved-up line; failures show the message; reduced motion skips the slide
- [x] T005 [B:T004] Add the leaderboard section to Settings (join, leave, change name); with tests
  - **Done when:** leaving deletes the entry and saves "declined"; renaming checks the name

### Verify

- [x] T006 [B:T005] Update the e2e helpers for the consent dialog, run all gates and the e2e suite, check the dialog in the browser
  - **Done when:** lint, typecheck, unit, e2e and build pass; screenshots of the consent dialog and the board

## Requirements Coverage

| AC | Tasks |
|----|-------|
| AC-001–AC-004, AC-006 | T004 |
| AC-005 | T001 |
| AC-007, AC-008 | T004 |
| AC-009, AC-010 | T005 |
| AC-011 | T003 |
| AC-012, AC-013 | T001, T002 |
| AC-014–AC-016 | T002 |
