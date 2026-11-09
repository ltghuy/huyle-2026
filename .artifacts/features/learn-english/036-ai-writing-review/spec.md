---
id: 036
feature: ai-writing-review
type: brownfield
scope: medium
status: to-review
branch: main
created: 2026-11-09
---

# Feature: AI review for "Bài viết"

## Overview

The daily and extra lessons end with a short writing task ("Bài viết"): a Vietnamese prompt such as "Viết 3 câu giới thiệu bản thân". Today the learner writes, opens the sample answers and marks themselves "Mình viết đúng" or "Còn lỗi". Nobody tells them what was wrong, and a learner who can't spot their own mistakes marks a wrong paragraph as right.

Feature 033 added AI grading for "Dịch câu" with the learner's own Google AI Studio keys. The owner asked on 2026-11-09 to use the same keys to review the writing task on grammar, vocabulary and meaning. Feature 033 listed free writing as out of scope; this feature brings it in.

## Goals

- [ ] A learner with a working key gets a verdict and specific Vietnamese feedback on grammar, vocabulary and meaning for every writing task, plus their paragraph corrected
- [ ] A learner without a key, or whose keys can't answer, keeps today's self-check with no extra step

## Out of Scope

| Feature | Reason |
|---------|--------|
| Overruling the AI's verdict | Chosen by the owner: the verdict counts, like a wrong translation |
| Checking the task's "words to use" | The learner is never shown that list, so it would be unfair to grade on it |
| Scores or partial credit | Chosen by the owner: pass or needs work, with notes per area |
| Sending AI-reviewed paragraphs to the owner's claim queue | Writing has no accepted answers to grow |
| AI review in Library exercises or the Arena | Writing tasks appear only in the daily and extra lessons |

## User Stories

### P1: My paragraph is reviewed by AI

- As a learner with a key, I want the AI to review my paragraph so that I learn what I got wrong instead of guessing
- **Why P1:** it is the feature
- **Independent Test:** with a working key, write a paragraph with one wrong tense for "Viết 3 câu về những gì bạn làm vào cuối tuần", press Kiểm tra, and read the grammar note and the corrected paragraph

**Acceptance Criteria:**

- [x] AC-001: WHEN the learner has a usable key THEN system SHALL show the writing task without "Xem bài mẫu" or self-marking; "Kiểm tra" is enabled once something is written
- [x] AC-002: WHEN the learner presses "Kiểm tra" THEN system SHALL send the Vietnamese prompt, the task's level and the paragraph to Google with the learner's keys, in the same key order and with the same take-over rules as "Dịch câu", showing "Đang chấm…" with the paragraph locked
- [x] AC-003: WHEN the review comes back THEN system SHALL show "Bài viết đạt" or "Bài viết cần sửa" with "Chấm bằng AI", and in the exercise: one line each for "Ngữ pháp", "Từ vựng" and "Ý nghĩa", each marked fine or to fix with a short Vietnamese note; then "Bài đã sửa" with the learner's paragraph corrected (or a note that nothing needed fixing); then the sample answers
- [x] AC-004: WHEN the review passes the paragraph THEN system SHALL record a correct attempt rated Good, however long the learner took to write; WHEN it doesn't THEN system SHALL record a wrong attempt, and the task comes back in the retry round like any wrong answer
- [x] AC-005: WHEN an AI review is shown THEN system SHALL not move on by itself; the learner presses "Tiếp tục" when they have read it
- [ ] AC-006: WHEN the AI judges THEN system SHALL judge for the task's CEFR level: a paragraph that answers the prompt and is understandable passes despite small slips, which are still noted

### P1: Falling back to the self-check

- As a learner, I want the writing task to keep working when AI can't answer so that my lesson never gets stuck

**Acceptance Criteria:**

- [x] AC-007: WHEN the learner has no usable key THEN system SHALL show today's self-check unchanged
- [x] AC-008: WHEN no key can answer (all out of quota or not valid, offline, Google slow or failing, unreadable reply) THEN system SHALL keep the paragraph, switch the task to the self-check and say "Lúc này chưa chấm bằng AI được, bạn tự so với bài mẫu nhé."

### P2: Tell learners what is sent

**Acceptance Criteria:**

- [x] AC-009: WHEN a learner reads "Chấm điểm bằng AI" in Cài đặt or the privacy page THEN system SHALL say that "Bài viết" paragraphs and their prompts are also sent to Google when a key is used

## Edge Cases

- WHEN the paragraph contains instructions aimed at the AI THEN system SHALL review it only as writing; the verdict only affects the learner's own record
- WHEN the paragraph isn't English, or doesn't answer the prompt THEN system SHALL not pass it, and the meaning note says why
- WHEN the learner leaves while the review runs THEN system SHALL drop the late review without recording it
- WHEN the AI's reply is cut off or malformed THEN system SHALL treat it like a failed call (another key once, then the self-check)
- WHEN a review takes longer than 15 seconds THEN system SHALL stop waiting and fall back to the self-check

## Success Criteria

- [ ] Every writing task with a working key ends with a verdict and three area notes, or falls back to the self-check; never a stuck "Đang chấm…"

## Open Questions

- None

## Notes

AC-006 is left open: the level rule is in the prompt (`src/learning/exercises/writing-ai.ts`), but only reviews from the real model can show it holds. Check a few A1 and B1 paragraphs with a working key.

Owner request and choices on 2026-11-09: three areas plus the corrected paragraph; the verdict counts with no override.

## Baseline

### Current Behavior

- The learner writes, presses "Xem bài mẫu", reads one or two sample answers, then marks "Mình viết đúng" or "Còn lỗi"; that mark is the result, always rated Good when right.
- A checked answer moves on by itself after 10 seconds.

### Gaps / Limitations

- No feedback on what was wrong; the verdict is the learner's own guess.
