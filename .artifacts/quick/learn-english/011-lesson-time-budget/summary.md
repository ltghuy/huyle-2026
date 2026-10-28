---
slug: lesson-time-budget
completed: 2026-10-28
---

# Summary: Keep the daily lesson to about 15 minutes

## What Changed

The daily lesson had a count cap (50 reviews, 10 new words) but no time limit, so a day with many reviews could reach about 78 steps. The planner now works to a 15-minute budget (`LESSON_BUDGET_SECONDS`). Each exercise kind has an estimated duration (`STEP_SECONDS`; a grammar card counts 90 s). The grammar part, the writing task and 3 sentence tasks at their slowest kind are reserved first. Due reviews, the most-forgotten first, fill what is left after 10 new words. When they don't all fit, new words drop to 5 and the reviews take the freed time. The home card's "khoảng N phút" uses the same estimates (it was 24 s a step, at least 5 minutes). With these numbers a new learner's grammar day is about 11 minutes. A grammar day has room for about 15 reviews with 10 new words, or about 26 with 5. A day without grammar has room for about 26 or about 38.

## Files Modified

| File | Change |
|------|--------|
| `src/learning/lesson-plan.ts` | Budget, per-kind estimates, `estimateSeconds`/`estimateMinutes`; reviews sized by the remaining time; grammar and writing planned before reviews |
| `src/learning/lesson-plan.test.ts` | Backlog test now checks the budget; new test that plans stay within 15 minutes with 0 or 200 due |
| `src/components/lesson/today-lesson.tsx` | Time estimate from `estimateMinutes` |
| `.artifacts/features/learn-english/001-learn-english-app/spec.md`, `design.md` | AC-014 and the planner decision |

## Patterns Discovered

None.

## Follow-Up

The per-kind seconds are guesses. Attempts store response times (`ms`), but only in each learner's browser, so checking the estimates needs a test session or response times added to the anonymous stats. A lesson already saved for today keeps its old plan; the budget applies from the next day's lesson. The separate review session (`/review`) still takes up to 50 items.
