---
slug: arena-game-guide
completed: 2026-11-05
---

# Summary: Game guide on the 1-1 setup card

## What Changed

The owner wanted a game guide on the "Thách đấu 1-1" card. A round help button now sits in the top-right corner of the VS header. Hovering or focusing it shows "Cách chơi và cách giành chiến thắng?", and pressing it opens "Hướng dẫn chơi", a dialog with three short sections (Vào trận, Cách chơi, Cách thắng) and two notes. The rules come from feature 023, and the question count, sudden-death limit and seconds per mode are read from `src/learning/arena/questions.ts`, so the guide follows those constants if they change. Spec 024 gained AC-009.

## Files Modified

| File | Change |
|------|--------|
| src/components/arena/game-guide.tsx | New: help button, tooltip and guide dialog |
| src/components/arena/game-guide.test.tsx | New: tooltip on hover, dialog content |
| src/components/arena/duel-setup.tsx | Puts the guide in the VS header corner |
| .artifacts/features/learn-english/024-arena-modes/spec.md | AC-009 added and proven |

## Patterns Discovered

None.

## Follow-Up

- The 30-second Ready window and reconnect grace are written into the guide text; `GRACE_MS` lives in `machine.ts` and the Ready window has no shared constant.
