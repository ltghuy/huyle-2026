---
id: 039
feature: team-battle
created: 2026-11-10
---

# Tasks: Team Battle ("Đấu đội")

## Summary

Total: 16 | Completed: 16 | Remaining: 0

## Execution Plan

```
T001 --> T002 --> T003 --> T004 --┬--> T006 --> T007 --┐
T005 -----------------------------┘                    │
T008 (after T001) ---------------------------------------┼--> T010 --> T011 --> T012 --> T013 --> T014
T009 (after T001, T007) --------------------------------┘
```

## Quality Gates

Run after each task or batch (from the repo root):

- `pnpm --filter learn-english lint`
- `pnpm --filter learn-english typecheck`
- `pnpm --filter learn-english test`
- At the end: `pnpm --filter learn-english build` and `pnpm --filter learn-english e2e`

## Tasks

### Rules (pure, `src/learning/arena/`)

- [x] T001 Add the team protocol, the hint mask and round decks
  - `team-protocol.ts` (settings, client frames, public room, `team-state` frame, `parseTeamFrame`); `hintMask` and `buildDeck` in `questions.ts`
  - **Done when:** unit tests cover settings bounds, frame parsing, "happy" → "h****", "I am happy" → "I a* h****", kept punctuation, deck length per minutes and wrap on a short pool -- VERIFIED

- [x] T002 [B:T001] Team machine: lobby
  - create, join up to size, assign / order / shuffle (host only), settings and size floor, start rules with reasons, leave and drops in the lobby, host leaving closes, idle close
  - **Done when:** `team-machine.lobby.test.ts` passes (AC-005, AC-008–AC-016, AC-047, AC-049, AC-050) -- VERIFIED

- [x] T003 [B:T002] Team machine: play and hints
  - countdown → decks, turns A/B with round starters, member rotation, question open/answer/reveal (2 s), clock end and the extra question, round end, hints
  - **Done when:** `team-machine.play.test.ts` passes, hints included (AC-017–AC-036) -- VERIFIED

- [x] T004 [B:T003] Team machine: results, drops and play again
  - sudden-death pairs, draws, match end with `record` effect and player totals, offline skip, mid-turn reopen, whole-team pause and forfeit, `left`, host away mid-match, play again
  - **Done when:** `team-machine.end.test.ts` and `team-machine.drops.test.ts` pass (AC-037–AC-046, AC-051) -- VERIFIED

### History

- [x] T005 [B:T001] Save and list team matches
  - migration `0011_team_battle.sql`, Drizzle schema, `teamHistoryEntries`, `recordTeamMatch`, `listHistory` with members, `ArenaMatch.team`
  - **Done when:** history tests with real SQL pass: rows per owner, team-side rounds, draw, members, pruning, account deletion (AC-040) -- VERIFIED

### Room and API

- [x] T006 [B:T004,T005] Run team rooms in `ArenaRoom`
  - kind dispatch, `createTeam` RPC, `status()` with `kind` and `size`, decks in `deck:{r}` (stored once, reloaded after a wake), no writes on typing or wrong typed answers, team record effect
  - **Done when:** `room.test.ts` team cases pass and every existing duel room test passes unchanged -- VERIFIED

- [x] T007 [B:T006] Team create route, join capacity, client calls
  - `/api/arena/teams`, `joinRoom` by kind and size, `RoomTicket.kind`, `createTeamRoom` in `arena-client.ts`
  - **Done when:** `routes.test.ts` covers team create validation and team join (full, started, seated player returns) (AC-002, AC-004, AC-005) -- VERIFIED

### Browser

- [x] T008 [B:T001] Share the socket loop and add the team room hook
  - `use-room-socket.ts` extracted from `use-arena-room.ts` (same public API), `use-team-room.ts`
  - **Done when:** `use-arena-room.test.ts` passes unchanged and a `use-team-room` test sends each team frame and reads `team-state` -- VERIFIED

- [x] T009 [B:T001,T007] Team screen, settings and guide; hub card on
  - `ui-ux-pro-max` pass recorded in design.md; `/arena/team` page, `team-setup.tsx`, `team-settings-fields.tsx` (`teamSettingsLine`), `team-game-guide.tsx`, hub "Đấu đội" link
  - **Done when:** component tests cover defaults (15 giây, own level), size 2–10, create call, guide text, hub link (AC-001, AC-002, AC-006, AC-007, AC-048) -- VERIFIED

- [x] T010 [B:T008,T009] Room screen branch and team lobby
  - `room-screen.tsx` picks duel or team by ticket kind; `team-lobby.tsx` with seats, invite panel, three columns, host controls, start reason, "Đổi cài đặt"
  - **Done when:** lobby tests cover host vs player controls, reorder, random split, the disabled start reasons (AC-003, AC-007–AC-016, AC-049) -- VERIFIED

- [x] T011 [B:T010] Team match screen
  - `team-match.tsx`: countdown, round clock, scores and hints, turn banner, question views with `watching` for non-turn players, hint button, hint line and first tile, reveal, round result, paused banner, leave dialog
  - **Done when:** match tests cover turn player vs watchers, hint rules, reveal and paused states (AC-017, AC-020, AC-021, AC-025, AC-029, AC-032–AC-035, AC-042) -- VERIFIED

- [x] T012 [B:T011,T005] Team results and team history rows
  - `team-results.tsx` (winner or "Hòa", rounds, members with answered/correct, "Chơi lại"); `match-row.tsx`, `match-details.tsx` for team entries
  - **Done when:** results and history tests pass (AC-038–AC-041, AC-051) -- VERIFIED

### End to end

- [x] T013 [B:T012] E2E team match on the preview
  - three e2e learners of its own; rounds last 5+ minutes, so the match ends by team B leaving (30 s, forfeit); `e2e/specs/arena-team.spec.ts`
  - **Done when:** three learners create, join, assign 2 vs 1, use a hint, reach a result, and every history shows the match -- VERIFIED

- [x] T014 [B:T013] Final verification
  - full gates, AC checkboxes, edge cases, knowledge.md gotchas, spec status `to-review`
  - **Done when:** lint, typecheck, unit, build and e2e pass; every AC proven is `[x]` -- VERIFIED

### Changes after the first real match (2026-11-10)

- [x] T015 The round ends at zero
  - rules: the clock is a hard deadline (alarm at the round end, the open question revealed with no point, answers after zero ignored, no extra question, `extra` stage gone); match screen and guide drop "Câu cuối"/"Câu bù"
  - **Done when:** machine tests cover the reveal at zero, no further question, sudden death on a tie and late answers; screen and guide tests updated (AC-027, AC-048) -- VERIFIED

- [x] T016 Tabs and team rows in "Lịch sử đấu"
  - "Tất cả · Đấu 1-1 · Đấu đội" tabs, the team tab's own W/L/D line, team rows with both teams' overlapping avatars and names
  - **Done when:** history tests cover each tab, the empty tab message, the team record line and the team row players (AC-052–AC-054) -- VERIFIED

## Requirements Coverage

| Requirement | Tasks |
| ----------- | ----- |
| AC-001 | T009 |
| AC-002 | T001, T007, T009 |
| AC-003 | T010 |
| AC-004, AC-005 | T002, T007, T010 |
| AC-006 | T009, T010 |
| AC-007 | T009, T010 |
| AC-008–AC-016 | T002, T010 |
| AC-017–AC-029 | T003, T011, T015 (AC-027) |
| AC-030–AC-036 | T001, T003, T011 |
| AC-037–AC-041 | T004, T005, T012 |
| AC-042–AC-047 | T002, T004, T011 |
| AC-048 | T009, T015 |
| AC-052–AC-054 | T016 |
| AC-049, AC-050 | T002, T010 |
| AC-051 | T004, T012 |
