---
id: "013"
feature: points-extra-lessons-streak-board
created: 2026-10-30
---

# Tasks: Spend points on extra lessons, rank the board by streak

## Summary

Total: 14 | Completed: 14 | Remaining: 0

## Execution Plan

```
T001 --> T002 --> T003 --> T004 --> T005 --> T006 --> T007 --> T008
                                                       (points + extra lessons)
T009 --> T010 --> T011 --> T012 --> T013
                (streak board, independent of T001–T008)
T008 + T013 --> T014 (specs 001/007, e2e)
```

## Quality Gates

Run after each task or batch:

- `pnpm --filter learn-english lint`
- `pnpm --filter learn-english typecheck`
- `pnpm --filter learn-english test`
- `pnpm --filter learn-english build` (after each group)

## Tasks

### Points and prices

- [x] T001 [P] Pay 20 points a day and add the points rules (`ExtraLesson` type, price, spent, balance, next price)
  - **Done when:** `points.test.ts` passes for prices 10, 13, 17, 22, 29, today-only counting and a negative balance; attendance tests expect 20

### Extra lesson storage and sync

- [x] T002 [B:T001] Add the `extraLessons` store (DB version 2) and its repository with the two-tab purchase lock
  - **Done when:** storage tests show a purchase is written once when two calls race for the same number, and an upgrade from version 1 keeps existing data
- [x] T003 [B:T002] Carry extra lessons in learner state, snapshot v3 (migration, trimmed plans, balance in summary) and the sync merge
  - **Done when:** snapshot tests upgrade a v2 file with no extra lessons and keep old prices without plans; merge tests keep both devices' purchases; replace/reset clear the store

### Extra lesson session and UI

- [x] T004 [B:T003] Generalize lesson position helpers and answer recording to either lesson kind
  - **Done when:** existing lesson tests pass and `recordAnswer` moves an extra lesson's position
- [x] T005 [B:T004] Add the extra lesson session (offer, buy, save position, complete)
  - **Done when:** `extra.test.ts` covers buy takes points, not enough points, resume without paying, second tab gets the same lesson, no points or streak on finish, nothing-new not sellable, yesterday's open lesson ignored
- [x] T006 [B:T005] Build the home card (price, balance, confirm, resume, disabled, nothing new) and show it when today is done
  - **Done when:** `extra-lesson-card.test.tsx` passes and the home card no longer says "Hẹn gặp lại bạn ngày mai" while an extra lesson can be bought
- [x] T007 [B:T005] Add the `/extra-lesson` page and player with its own finish screen
  - **Done when:** a runner test finishes an extra lesson with no points and no board; build lists `/extra-lesson` as static
- [x] T008 [B:T001] Show the balance on home and the balance plus total earned on the profile
  - **Done when:** home shows earned minus spent; profile shows both numbers

### Streak board

- [x] T009 [P] Change board rules: remove week helpers, add epoch and limits, numbers from attendance, slide on (streak, earned)
  - **Done when:** `leaderboard.test.ts` covers streak/earned/previous numbers and the new slide
- [x] T010 [B:T009] Add the D1 migration (drop week/points, add streak/earned/last_date and index) and update the Drizzle schema
  - **Done when:** `drizzle-kit generate` output is committed and the SQLite test helper applies it
- [x] T011 [B:T010] Rank by streak in the service with the plausibility guard, new body schema and 422 in the route
  - **Done when:** service tests cover order, ties, hidden broken streaks, old rows hidden, previous rank, refused jumps, allowed offline days; route tests cover 422 and bad dates
- [x] T012 [B:T011] Send streak and earned from the client and adjust rename
  - **Done when:** client sends the new body after a daily lesson; rename with a broken streak sends nothing
- [x] T013 [B:T012] Update board UI and copy (`StreakBoard`, dialog, consent, Settings)
  - **Done when:** `leaderboard.test.tsx` shows rows in "N ngày" and no Monday or weekly wording remains

### Wrap-up

- [x] T014 [B:T008,T013] Update 001 and 007 specs for what 013 changes, and the e2e specs (board row in days, buy an extra lesson)
  - **Done when:** `pnpm --filter learn-english e2e` passes and the 001/007 specs reference 013

## Requirements Coverage

| Requirement | Tasks |
| ----------- | ----- |
| AC-001 | T001 |
| AC-002 | T001, T008 |
| AC-003 | T006 |
| AC-004 | T005, T006 |
| AC-005 | T001, T005 |
| AC-006 | T001, T005 |
| AC-007 | T005, T006 |
| AC-008 | T005, T007 |
| AC-009 | T005, T006 |
| AC-010 | T011, T012, T013 |
| AC-011 | T011 |
| AC-012 | T009, T013 |
| AC-013 | T011 |
| AC-014 | T007, T012 |
| AC-015 | T013 |
| AC-016 | T009, T011 |
| AC-017 | T002, T003 |
| AC-018 | T003 |
