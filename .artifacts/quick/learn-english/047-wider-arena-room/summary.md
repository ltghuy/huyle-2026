---
slug: wider-arena-room
completed: 2026-11-05
---

# Summary: Wider Arena room

## What Changed

The room's outer container went from `max-w-2xl` (672 px) to `max-w-4xl` (896 px), so the header, scoreboard, timer and question card get wider during the duel. The lobby column inside it went from `max-w-md` (448 px) to `max-w-2xl` (672 px), so the player rows and the Ready button are wider. The invite panel's code tiles and buttons keep their size and stay centred. Lint and typecheck pass. I didn't check it in the browser, because a live room needs two signed-in learners.

## Files Modified

| File | Change |
|------|--------|
| apps/learn-english/src/components/arena/room-screen.tsx | `max-w-2xl` to `max-w-4xl` |
| apps/learn-english/src/components/arena/lobby.tsx | `max-w-md` to `max-w-2xl` |

## Patterns Discovered

None.

## Follow-Up

None.
