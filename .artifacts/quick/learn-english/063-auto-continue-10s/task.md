---
slug: auto-continue-10s
status: done
branch: main
created: 2026-11-09
---

# Quick Task: Wait 10 seconds before moving on by itself

## What

After a checked answer, the exercise runner waits 10 seconds instead of 3 before it moves to the next step by itself (owner, 2026-11-09).

## Files

- `apps/learn-english/src/components/exercise/exercise-runner.tsx` (`AUTO_CONTINUE_MS`)
- `apps/learn-english/src/app/globals.css` (`--animate-auto-continue`)
- `.agents/baselines/learn-english/exercise-runner.md`

## Expected Outcome

"Tiếp tục" fills from left to right over 10 seconds, then the runner moves on as if it had been pressed. Pressing it or Enter earlier still moves on at once; the leave dialog still pauses it; with reduced motion the fill isn't animated and the 10 seconds still apply.

## Quality Gates

Run after the change, before marking done:

- `pnpm --filter learn-english lint`
- `pnpm --filter learn-english typecheck`
- `pnpm --filter learn-english test`
