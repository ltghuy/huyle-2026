---
slug: arena-game-guide
status: done
branch: main
created: 2026-11-05
---

# Quick Task: Game guide on the 1-1 setup card

## What

Add a help button to the top-right corner of the "Thách đấu 1-1" card. Hovering or focusing it shows the tooltip "Cách chơi và cách giành chiến thắng?", and clicking it opens a dialog that explains how to play and win.

## Files

- apps/learn-english/src/components/arena/game-guide.tsx (new)
- apps/learn-english/src/components/arena/duel-setup.tsx (places the button in the VS header)
- apps/learn-english/src/components/arena/game-guide.test.tsx (new)
- .artifacts/features/learn-english/024-arena-modes/spec.md (new AC-009)

## Expected Outcome

The rules in the dialog match feature 023: room code and Ready window, 12 shared questions per round, time per mode, first correct answer scores 1 point, round and match winners, sudden death on a tie, the 30-second reconnect rule, and that a match doesn't change points, streak or Ôn tập.

## Quality Gates

Run after the change, before marking done:

- pnpm --filter learn-english lint
- pnpm --filter learn-english typecheck
- pnpm --filter learn-english test
- pnpm --filter learn-english build
