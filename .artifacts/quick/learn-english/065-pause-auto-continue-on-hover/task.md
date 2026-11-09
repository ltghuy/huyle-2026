---
slug: pause-auto-continue-on-hover
status: done
branch: main
created: 2026-11-10
---

# Quick Task: Pause the auto-continue while the mouse is over "Tiếp tục"

## What

After a checked answer, holding the mouse over "Tiếp tục" pauses the 10 second wait and the button's fill (owner, 2026-11-10). Moving the mouse off resumes from where it stopped. The leave dialog now pauses the same way instead of restarting the wait.

## Files

- `apps/learn-english/src/components/exercise/exercise-runner.tsx`
- `apps/learn-english/src/components/exercise/exercise-runner.test.tsx`
- `.agents/baselines/learn-english/exercise-runner.md`

## Expected Outcome

The fill stops while a mouse pointer is on the button and picks up again when it leaves; the runner moves on once the full 10 seconds have run without the mouse on it. Touch taps are not treated as hovering. Pressing the button or Enter still moves on at once.

## Quality Gates

- `pnpm --filter learn-english lint`
- `pnpm --filter learn-english typecheck`
- `pnpm --filter learn-english test`
