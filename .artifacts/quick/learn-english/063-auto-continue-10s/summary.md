---
slug: auto-continue-10s
completed: 2026-11-09
---

# Summary: Wait 10 seconds before moving on by itself

## What Changed

The owner asked on 2026-11-09 for 10 seconds instead of 3. `AUTO_CONTINUE_MS` is now 10000 and the button's fill animation lasts 10 s to match. The runner tests use the constant, so they cover the new wait unchanged (56 passed); lint and typecheck pass.

## Files Modified

| File | Change |
|------|--------|
| `apps/learn-english/src/components/exercise/exercise-runner.tsx` | `AUTO_CONTINUE_MS` 3000 → 10_000 |
| `apps/learn-english/src/app/globals.css` | `auto-continue` animation 3s → 10s |
| `.agents/baselines/learn-english/exercise-runner.md` | 10 seconds, with a pointer to this task |

## Patterns Discovered

None

## Follow-Up

None. Quick 056's task file still says 3 seconds, as the record of that change; the baseline is the current behavior.
