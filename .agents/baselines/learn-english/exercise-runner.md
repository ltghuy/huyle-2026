---
area: exercise-runner
scope: the focus-mode player for study cards and exercises (apps/learn-english/src/components/exercise/exercise-runner.tsx)
captured: 2026-11-08
---

# Baseline: Exercise runner

## Scope

The full-screen player that the daily lesson, extra lessons, review sessions, Library exercises and hard-word practice all use. It shows one step at a time, checks the answer and moves on. The exercise views themselves are out of scope.

**Directories:** `src/components/exercise/`

## Current Behavior

### Checking and moving on

- An exercise step shows "Kiểm tra", enabled once the learner has an answer. Submitting grades the answer, plays the right or wrong sound and shows the feedback panel; "Chính xác!" fades after 2 seconds, while a wrong answer keeps the right answer on screen.
- After checking, the button becomes "Tiếp tục" and fills over 10 seconds (`AUTO_CONTINUE_MS`; not animated with reduced motion). The runner then moves on by itself, right answer or wrong, unless the leave dialog is open; pressing the button or Enter moves on sooner (quick 056; 3 seconds until quick 063).
- When matching marks a "Dịch câu" answer wrong, the answer could be claimed and the learner has a usable Google AI key (feature 033), the runner asks the AI before showing a result: the button reads "Đang chấm…" and the answer stays locked. The time used for the rating is taken when "Kiểm tra" is pressed, so the wait doesn't count. Leaving meanwhile aborts the call and drops the late verdict.
- A study card shows "Tiếp tục" straight away and records no outcome.
- On the last step, "Tiếp tục" finishes once (a second press shows "Đang lưu…" and does nothing). With `retryWrong`, the wrong answers come back in rounds before finishing (feature 006).

### Outcomes

- Each first-try answer is passed to `onOutcome` when checked. A wrong answer that can be claimed (feature 016) is held until the learner moves on, claims it or leaves; a claim turns it into a correct, hinted, claimed result. An answer the AI accepts is recorded at once as a normal correct result (`aiGraded`) and sent to the claim queue with `source: "ai"`; one the AI rejects is held like any wrong answer, with the AI's Vietnamese explanation; when no key could answer, matching decides and the result carries `aiUnavailable` (feature 033).
- Retry rounds never change the score or call `onOutcome`.

### Leaving

- The close button leaves at once before the first answer; afterwards it asks "Dừng bài ở đây?" and records any held outcome before leaving.

## Dependencies

### Depends On

| Dependency | Nature |
|------------|--------|
| `src/components/exercise/registry` | the view, grader and claim rule for each exercise kind |
| `src/lib/answer-sound` | right and wrong sounds |
| `src/claims/claims-client` | sends claims |
| `src/lib/ai-keys` | whether the learner has a usable AI key (feature 033) |

### Depended On By

| Dependent | Nature |
|-----------|--------|
| lesson, extra lesson, review session, Library exercise run, hard-word practice | play their steps through it |

## Configuration Surface

| Setting | Purpose | Current |
|---------|---------|---------|
| `CORRECT_FEEDBACK_MS` | how long "Chính xác!" stays | 2000 ms |
| `AUTO_CONTINUE_MS` | wait before moving on after a checked answer; the `auto-continue` animation in `globals.css` matches it | 10000 ms |

## Gaps

- No spec owns the runner's step flow; features 006 and 016 describe retries and claims only.

## Risks

- None noted.
