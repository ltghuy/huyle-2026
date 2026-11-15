---
id: "043"
feature: translate-hint
type: brownfield
scope: medium
status: to-review
branch: main
created: 2026-11-15
---

# Feature: A hint for Dịch câu

## Overview

In "Dịch câu" (feature 016) the learner reads a Vietnamese sentence and types the English with no help at all. At B2 and above a single unknown word ("bum", "layabout") or a grammar point leaves them stuck, and the only way out is to give a wrong answer. Nghe chép already has a "Gợi ý" button (feature 010, AC-015). Dịch câu gets one too. The vocabulary part comes from the content (the words the sentence practises, `wordIds`, and its grammar lesson, `grammarSlug`). The grammar tips (which tense, which structure) come from Gemini with the learner's own Google AI key, the same way AI grading works (feature 033): the app still runs and pays for no AI.

2026-11-15, owner: the first version listed the wrong variants' notes ("Câu ở quá khứ nên dùng 'shocked'"). Those are corrections that give the answer away, not hints, so they are gone; the owner chose the learner's key over pre-generating hints in the content.

## Goals

- [ ] A learner stuck on a translation can get vocabulary and grammar help without leaving the exercise
- [ ] A hinted answer counts as Hard in the review schedule, as hints do everywhere else

## Out of Scope

| Feature | Reason |
|---------|--------|
| Hints in the Arena | Matches are competitive; both players get the same help (none) |
| AI hints without the learner's key, or hints pre-generated in the content | Owner chose the learner's key (2026-11-15); a reviewed content backfill can come later |
| A hint limit kept across runs or days, or for Nghe chép's hint | The limit protects AI requests; it is per run and only for Dịch câu (owner, 2026-11-15) |
| Several hint levels revealed one by one | One press, as in Nghe chép; can come later if learners ask |
| New hint content in `content/` | No re-review of approved items |

## User Stories

### P1: A hint when I'm stuck on a translation

- As a learner translating a sentence, I want a hint with the key words and the grammar so that I can finish it myself
- **Why P1:** it is the whole request
- **Independent Test:** open a Dịch câu set, press "Gợi ý", see the words and grammar notes, answer, and see the attempt recorded as hinted and Hard

**Acceptance Criteria:**

- [x] AC-001: WHEN a Dịch câu exercise has a hint and is not yet checked THEN system SHALL show a "Gợi ý" button under the answer box, and SHALL keep the hint hidden until it is pressed
- [x] AC-002: WHEN the learner presses "Gợi ý" THEN system SHALL show, in place of the button, a "Từ vựng" part listing each word the sentence practises as headword, word type and Vietnamese meanings (at most two), shown only when there is a word, and a "Ngữ pháp" part with the sentence's grammar lesson title (when it has one) and the AI's grammar hints (AC-006 to AC-008); the wrong variants' notes SHALL not show
- [x] AC-003: WHEN a hinted answer is checked THEN system SHALL record it as hinted, which rates a right answer Hard (feature 010, AC-015)
- [x] AC-004: WHEN a sentence has no word and no grammar lesson and the learner has no usable AI key THEN system SHALL show no "Gợi ý" button
- [x] AC-005: WHEN a translation question appears in the Arena THEN system SHALL show no "Gợi ý" button

### P1: Grammar tips from AI

- As a learner with a Google AI key, I want the hint to tell me which tense or structure the sentence needs, without the answer, so that I work the sentence out myself
- **Why P1:** the owner's ask (2026-11-15)
- **Independent Test:** with a key, press "Gợi ý" on a B2 sentence and read one to three tips naming tenses or structures and no English word of the answer

**Acceptance Criteria:**

- [x] AC-006: WHEN a learner with a usable AI key presses "Gợi ý" THEN system SHALL ask Gemini once for that sentence (not before the press, and not again while the visit lasts) and SHALL show one to three short Vietnamese tips naming the tense or structure to use, each with its English grammar name, with a loading state while it waits (at most 8 s, keys tried as in feature 033)
- [x] AC-007: WHEN a tip contains a word of five or more letters from the reference English THEN system SHALL drop it, so no tip gives the answer away
- [x] AC-008: WHEN the learner has no usable AI key THEN the "Ngữ pháp" part SHALL say that adding a Google AI key in Cài đặt gives grammar tips; WHEN Gemini gives no tip (refused, timed out, offline, every tip dropped) THEN it SHALL say "Lúc này chưa lấy được gợi ý ngữ pháp từ AI." and keep the rest of the hint

### P2: A limit on hints, to keep AI requests down

- As the owner, I want each run of an exercise set (10 questions) to allow 3 hints, so that learners' AI keys and quotas aren't spent on every question, and so that learners try first
- **Why P2:** asked by the owner on 2026-11-15, after AC-006

**Acceptance Criteria:**

- [x] AC-009: WHEN a run of the runner starts THEN system SHALL allow 3 "Gợi ý" presses in it, across its retry rounds, and SHALL show how many are left on the button ("Gợi ý · còn 3"); WHEN none is left THEN the button SHALL look disabled ("Gợi ý · hết lượt"), SHALL open no hint and ask no AI, and SHALL show a tooltip on hover, keyboard focus and tap saying the 3 hints are used and that the answer and each word are shown after "Kiểm tra"

## Edge Cases

- WHEN the learner presses "Gợi ý" before typing anything THEN system SHALL still count the answer they type next as hinted
- WHEN a word id in `wordIds` is missing from the content (removed) THEN system SHALL leave it out of the hint
- WHEN the AI's reply can't be read THEN system SHALL try one more key at most, as grading does (feature 033)
- WHEN the answer has been checked THEN system SHALL hide the hint; the correct sentence shows instead

## Success Criteria

- [ ] Pressing "Gợi ý" on a B2 Dịch câu sentence with a key shows its word with meanings and at least one tense or structure tip that names no word of the answer
- [ ] A hinted right answer is stored with `hinted: true` and rating "hard"

## Verification

- AC-009: `src/components/exercise/exercise-runner.test.tsx` (four hinted questions: "còn 3", "còn 2", "còn 1", then "hết lượt" with `aria-disabled`, no hint on press, tooltip text). Not checked in the browser: it would spend three AI calls of the owner's key and record practice answers.

- AC-001 to AC-008: `src/components/exercise/exercise-runner.test.tsx` (hint hidden until "Gợi ý"; words; no-key note; AI tips asked only on press; failure note; no button without content or key, nor without a hint as in the Arena; outcome `hinted: true`); `src/learning/exercises/hint-ai.test.ts` (prompt, cap of three, giveaway words dropped, unreadable replies refused); `src/learning/exercises/translate.test.ts`; `src/lib/session/session.test.ts`. Rating Hard comes from `rate()` (010 AC-015).
- Browser, 2026-11-15, localhost:3002, B2 people-family set, one working key: "Ca sĩ trẻ trở thành người được giới truyền thông yêu thích." showed "darling (noun): …" under Từ vựng and two tips under Ngữ pháp (Past Simple; an affirmative sentence with a state verb), with no English word of the answer.

## Open Questions

None. Owner asked for the button on 2026-11-15 and for AI grammar tips with the learner's key the same day; one press and the Hard rating follow Nghe chép.
