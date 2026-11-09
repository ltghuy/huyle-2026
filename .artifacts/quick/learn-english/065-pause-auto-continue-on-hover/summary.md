---
slug: pause-auto-continue-on-hover
completed: 2026-11-10
---

# Summary: Pause the auto-continue while the mouse is over "Tiếp tục"

## What Changed

The runner keeps what's left of the 10 second wait for the current answer and only runs the timer when the leave dialog is closed and no mouse is over "Tiếp tục". The fill gets `animation-play-state: paused` at the same moments, so it stays in step with the timer. Only `pointerType === "mouse"` pauses, because a tap also fires pointerenter. Before this, closing the leave dialog restarted the wait from zero; now it resumes. Two new tests cover the mouse pause with resume and the touch case (56 passed). Lint and typecheck pass.

## Files Modified

| File | Change |
|------|--------|
| `apps/learn-english/src/components/exercise/exercise-runner.tsx` | hover pause, remaining-time timer, paused fill |
| `apps/learn-english/src/components/exercise/exercise-runner.test.tsx` | 2 tests |
| `.agents/baselines/learn-english/exercise-runner.md` | pause behavior |

## Patterns Discovered

None

## Follow-Up

None
