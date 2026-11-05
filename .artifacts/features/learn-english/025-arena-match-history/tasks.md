---
id: 025
feature: arena-match-history
created: 2026-11-05
---

# Tasks: Arena match history

## Summary

Total: 9 | Completed: 9 | Remaining: 0

## Execution Plan

```
T001 --> T002 --> T004 --> T005 --> T006 --┐
T003 ----------┘                   T007 ---┼--> T009
                          T008 ------------┘
```

## Quality Gates

Run after each task or batch (in `apps/learn-english`):

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build` (after UI tasks)

## Tasks

### Match summary from the room (pure)

- [x] T001 [P] Add `suddenDeath` to round results and the match summary to the `record` effect (machine + protocol)
  - **Done when:** machine tests show `record` carries endedAt, reason, settings, both players (name, image, roundsWon) and all finished rounds; a round with sudden death has `suddenDeath: true`; a cancelled lobby emits no `record` (AC-001, AC-002) -- VERIFIED

- [x] T002 [B:T001] Add the pure `historyEntries(match, matchId)` that turns a match into the two owner-side entries
  - **Done when:** unit tests show mirrored entries (score, won, forfeit, opponent snapshot, rounds with `won`, `suddenDeath`, `onTime`), and a forfeit mid-round keeps only the finished rounds (AC-001, AC-015) -- VERIFIED

### Storage

- [x] T003 [P] Add the `arena_matches` table, index and migration 0007; apply it locally
  - **Done when:** `drizzle-kit generate` writes `0007_*.sql` with the PK, both FKs (cascade / set null) and the index; `wrangler d1 migrations apply learn-english --local` succeeds -- VERIFIED

- [x] T004 [B:T002,T003] Add the history data module (`recordMatch`, `listHistory`) and write it from the room after the stats
  - **Done when:** tests on `sqliteDb` show newest-first reads with stats in one batch, 55 → 50 kept, a stable order for equal times, a duplicate match ignored, and learner deletion cascading; the room calls it in its own try/catch so a failure still ends the match (AC-001, AC-005, edge cases) -- VERIFIED

- [x] T005 [B:T004] Blank the opponent snapshot on account deletion
  - **Done when:** a test shows that deleting Lan's account leaves Minh's match with no opponent name, picture or id, and removes Lan's own rows (edge cases) -- VERIFIED

### API

- [x] T006 [B:T004] Add `GET /api/arena/matches`, its response types and `fetchArenaMatches`
  - **Done when:** route tests cover 200 `{ stats, matches }`, 401 for a guest and 503 on a D1 error; the route takes no user id from the request -- VERIFIED

### UI

- [x] T007 [B:T006] Build the history page: list, row, details dialog, time label, and the empty, error and loading states
  - **Done when:** component tests cover the row fields, both forfeit labels, the deleted opponent, empty, error + "Thử lại", and the dialog rounds with sudden-death and on-time notes; the guest sees the sign-in prompt; `BackToHub` goes to `/arena`; no sideways scroll at 320 px (AC-003, AC-004, AC-006–AC-008, AC-013–AC-016) -- VERIFIED

- [x] T008 [B:T006] Add the "Lịch sử đấu" card to the hub and refresh history after a match
  - **Done when:** component tests cover the guest, no-match and latest-match states; the card is one keyboard-reachable link to `/arena/history`; the results screen invalidates the history query (AC-009–AC-012) -- VERIFIED

### Wrap-up

- [x] T009 [B:T005,T007,T008] Add the privacy note line, run e2e on the preview, update knowledge and docs
  - **Done when:** the privacy page mentions the 50 newest matches with the opponent's name and picture; an e2e run plays a match and sees it in both accounts' history; `pnpm typecheck && pnpm lint && pnpm build` pass; Success Criteria checked in light and dark at 320 px -- VERIFIED

## Requirements Coverage

| Requirement | Tasks |
| ----------- | ----- |
| AC-001 | T001, T002, T004 |
| AC-002 | T001 |
| AC-003 | T007 |
| AC-004 | T007 |
| AC-005 | T004 |
| AC-006 | T007 |
| AC-007 | T007 |
| AC-008 | T007 |
| AC-009 | T008 |
| AC-010 | T008 |
| AC-011 | T008 |
| AC-012 | T008 |
| AC-013 | T007 |
| AC-014 | T001, T002, T007 |
| AC-015 | T002, T007 |
| AC-016 | T007 |
| Edge cases | T004, T005, T007 |
| Success Criteria | T009 |
