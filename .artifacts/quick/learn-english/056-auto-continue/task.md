---
slug: auto-continue
status: done
branch: main
created: 2026-11-08
---

# Quick Task: Move on by itself 3 seconds after an answer

## What

After a checked answer, right or wrong, the exercise runner moves to the next step by itself if the learner hasn't pressed "Tiếp tục" within 3 seconds. Study cards still wait for the button. The owner first chose right answers only, then asked for wrong answers too (2026-11-08).

## Files

- `apps/learn-english/src/components/exercise/exercise-runner.tsx`
- `apps/learn-english/src/components/exercise/exercise-runner.test.tsx`
- `apps/learn-english/src/app/globals.css` (the countdown fill on the button)
- `.agents/baselines/learn-english/exercise-runner.md` (captured before the change, updated after)

## Expected Outcome

- A checked answer: "Tiếp tục" fills from left to right over 3 seconds, then the runner moves on as if it had been pressed. Pressing it earlier moves on at once.
- The timer doesn't run while the leave dialog is open, and restarts when it closes.
- With reduced motion the fill is not animated; the 3 seconds still apply.

## Quality Gates

- `pnpm --filter learn-english lint`
- `pnpm --filter learn-english typecheck`
- `pnpm --filter learn-english test`
- `pnpm --filter learn-english build`
