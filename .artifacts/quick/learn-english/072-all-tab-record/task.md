---
slug: all-tab-record
status: done
branch: main
created: 2026-11-15
---

# Quick Task: "Tất cả" record line counts team matches too

## What

On "Lịch sử đấu", the "Tất cả" tab's record line counts the listed matches (duels and team matches) instead of the 1-1 Arena record.

## Files

- apps/learn-english/src/components/arena/match-history.tsx
- apps/learn-english/src/components/arena/match-history.test.tsx
- .artifacts/features/learn-english/039-team-battle/spec.md (AC-053)

## Expected Outcome

With 6 listed duels (5 won, 1 lost) and 2 lost team matches, "Tất cả" reads "5 thắng · 3 thua · 8 trận gần nhất" (it read "5 thắng · 1 thua"). Draws show as "· N hòa" only when there are any. "Đấu 1-1" keeps the Arena record (AC-040); "Đấu đội" is unchanged.

## Quality Gates

- pnpm --filter learn-english lint
- pnpm --filter learn-english typecheck
- pnpm --filter learn-english test
