---
id: 006
feature: retry-wrong-answers
type: brownfield
scope: medium
status: done
branch: feature/learn-english
created: 2026-10-28
---

# Feature: Retry wrong answers until the set is all correct

## Overview

When a learner finishes a practice set in Bài tập, a grammar topic's practice in Ngữ pháp, or a Từ khó practice, the set
ends right after the last question, even if some answers were wrong. The score
says the wrong ones will come back in Ôn tập, but the learner leaves without
ever giving the right answer themselves. The owner wants every practice set to
end only once each question has been answered correctly: after the last
question, the questions answered wrong come back, again and again, until none
is left.

## Goals

- [x] A practice set (Bài tập, a grammar topic's practice, Từ khó) ends only after every question in it has been answered correctly at least once
- [x] The score and the review schedule still reflect the first try, so a word the learner got wrong still comes back soon in Ôn tập

## Out of Scope

| Feature | Reason |
|---------|--------|
| Retry rounds in the daily lesson | Keeps the lesson within its 15-minute budget and keeps resuming simple (owner, 2026-10-28) |
| Retry rounds in Ôn tập sessions | The review schedule already brings a wrong item back within minutes (owner, 2026-10-28) |
| New multiple-choice options or a new question for a retry | The retry repeats the same question; only letter tiles are shuffled again |
| Counting retries in the schedule or the stats | A word fixed a minute later must not get a longer interval (owner, 2026-10-28) |

## User Stories

### P1: Fix every wrong answer before the set ends

- As a learner, I want the questions I got wrong to come back at the end of the set so that I finish having answered each one correctly
- **Why P1:** The whole request
- **Independent Test:** Start a Bài tập set, answer one question wrong and the rest right: after the last question that one question comes back; answer it right and the score screen shows

**Acceptance Criteria:**

- [x] AC-001: WHEN a learner answers the last question of a Bài tập set, a grammar topic's practice or a Từ khó practice and at least one answer in it was wrong THEN system SHALL say how many were wrong and offer to answer them again, instead of showing the score
- [x] AC-002: WHEN the learner starts the retry THEN system SHALL show only the questions answered wrong, in their original order, with the same feedback after each answer
- [x] AC-003: WHEN a retry round ends with wrong answers again THEN system SHALL start another round with only those, until a round has none wrong
- [x] AC-004: WHEN a retry round ends with every answer correct THEN system SHALL finish the set as today (Bài tập and grammar practice: the score screen; Từ khó: the closing message)
- [x] AC-005: WHILE a retry round runs THEN system SHALL show that it is a retry and the progress within that round

### P1: The first try is what counts

- As a learner, I want my score and review schedule to reflect how I first answered so that retrying doesn't hide what I need to practise
- **Why P1:** Without it, retries would push wrong words further away in Ôn tập

**Acceptance Criteria:**

- [x] AC-006: WHEN a retried question is answered THEN system SHALL not save it as an attempt, not change the review schedule and not count it in the anonymous stats
- [x] AC-007: WHEN the set finishes after retries THEN system SHALL show the first-try score and say that the wrong answers were all corrected

## Edge Cases

- WHEN every answer was right the first time THEN system SHALL finish exactly as today, with no retry step
- WHEN the learner leaves during a retry THEN system SHALL ask for confirmation as it does today; their first-try answers stay saved
- WHEN a listening question fell back to its non-audio version because the audio failed THEN system SHALL retry that fallback version
- WHEN the daily lesson or an Ôn tập session ends with wrong answers THEN system SHALL finish as today, without a retry

## Success Criteria

- [x] No Bài tập set, grammar practice or Từ khó practice can reach its end screen while a question in it has no correct answer
- [x] A word answered wrong on the first try is still due in Ôn tập after it was fixed in the retry

## Open Questions

None.

## Notes

- Owner decisions (2026-10-28): practice only (Bài tập and Từ khó); only the first try counts. A grammar topic's practice in Ngữ pháp shares the Bài tập runner and score screen, so it is practice too.
- Related: 001 AC-029 (score and review schedule after an exercise), AC-031 (hard-words practice).

## Evidence

- AC-001 to AC-007: `src/components/exercise/exercise-runner.test.tsx` "retrying wrong answers (feature 006)": two retry rounds, then the first-try score `{ correct: 1, total: 2, corrected: 1 }` with only 2 answers recorded; no retry when all are right or when the caller doesn't ask (daily lesson, Ôn tập); leaving during a retry asks first
- Grammar practice: `src/components/grammar/grammar-browser.test.tsx` retries the wrong item, shows "sửa đúng cả 1 câu sai" and saves 2 attempts
- End to end: `e2e/specs/exercises.spec.ts` plays a Bài tập set through its retry rounds to "Hoàn thành bài tập"; all 10 specs pass
- Checked in the browser at phone width (2026-10-28): the "Còn N câu chưa đúng" screen and the retry round header
- Goals and success criteria audited 2026-10-28 against the evidence above

## Baseline

### Current Behavior

- A Bài tập set shows the score after its last question, with "Làm lại" (a new round of the whole set) and "Về danh sách"
- A Từ khó practice closes after its last question with a "Xong rồi! Bạn trả lời đúng X/Y câu." message
- Every checked answer is saved and reschedules its card

### Gaps / Limitations

- Wrong answers are only seen again later in Ôn tập; the set never asks for the right answer
