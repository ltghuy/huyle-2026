---
slug: auto-continue
completed: 2026-11-08
---

# Summary: Move on by itself 3 seconds after an answer

## What Changed

After a checked answer, right or wrong, the exercise runner now moves to the next step on its own if the learner hasn't pressed "Tiếp tục" within 3 seconds. The button fills from left to right over those 3 seconds so the learner can see it coming. A wrong answer moves on too, so the learner has 3 seconds to read the right answer and the explanation or to report the grading; a held wrong answer is recorded the same way as when the button is pressed. Study cards wait for the button. The leave dialog pauses the timer. With reduced motion the fill is hidden and the timer still runs. Every screen that uses the runner gets this: the daily lesson, extra lessons, review sessions, Library exercises and hard-word practice.

## Files Modified

| File | Change |
|------|--------|
| `apps/learn-english/src/components/exercise/exercise-runner.tsx` | `AUTO_CONTINUE_MS`, the timer (`useEffectEvent` calls the same `handleContinue` as the button) and the fill on "Tiếp tục" |
| `apps/learn-english/src/components/exercise/exercise-runner.test.tsx` | Five tests: moves on at 3 s after a right answer and after a wrong one, finishes on the last question, waits on a study card, waits while the leave dialog is open |
| `apps/learn-english/src/app/globals.css` | `auto-continue` keyframes and `--animate-auto-continue` |
| `.agents/baselines/learn-english/exercise-runner.md` | New baseline, captured before the change and updated after |

## Patterns Discovered

None

## Follow-Up

- The fill animation was not seen in a browser: exercises need a Google sign-in, which the headless browser doesn't have. The timing is covered by tests.
- The same browser check found the footer links wrapping at 800 px; fixed in `site-footer.tsx` and noted in feature 029.
