---
slug: lesson-time-budget
status: done
branch: feature/learn-english
created: 2026-10-28
---

# Quick Task: Keep the daily lesson to about 15 minutes

## What

Give the daily lesson planner a 15-minute budget, with an estimated time per exercise kind, and show the same estimate on the home card.

## Files

- `src/learning/lesson-plan.ts`: `LESSON_BUDGET_SECONDS`, per-kind `STEP_SECONDS`, `estimateSeconds`/`estimateMinutes`; reviews sized by the budget
- `src/learning/lesson-plan.test.ts`
- `src/components/lesson/today-lesson.tsx`: "khoảng N phút" from `estimateMinutes`
- `.artifacts/features/learn-english/001-learn-english-app/spec.md` (AC-014, Notes), `design.md` (planner decision)

## Expected Outcome

The planner sets aside time for the grammar part (on grammar days), the writing task and 3 sentence tasks at their slowest kind. Due reviews, the most-forgotten first, fill what is left after 10 new words (2 steps each). If they don't all fit, new words drop to 5 and reviews take the freed time. Reviews beyond the budget, or beyond the old cap of 50, roll over to later days. Every plan's estimated time stays at or under 15 minutes. The home card's "khoảng N phút" comes from the same per-kind estimates instead of 24 seconds a step. The per-kind seconds are estimates, not measurements. A lesson already saved for today keeps its plan; the budget applies from the next lesson.

## Quality Gates

Run after the change, before marking done:

- `pnpm --filter learn-english lint`
- `pnpm --filter learn-english typecheck`
- `pnpm --filter learn-english test`
- `pnpm --filter learn-english build`
