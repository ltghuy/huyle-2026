---
id: 010
feature: dictation
type: brownfield
scope: medium
status: done
branch: feature/learn-english
created: 2026-10-29
---

# Feature: Dictation ("Nghe chép")

## Overview

The course trains listening only at the word level: the learner hears one word and picks or types it. Example sentences have audio, but every sentence exercise shows the sentence's words or its Vietnamese meaning, so the learner can answer by reading instead of listening. Vietnamese learners commonly understand written English much better than spoken English. They miss linked sounds, weak forms and word endings (*-s*, *-ed*, final consonants), and nothing in the course makes them notice these. Dictation fills this gap. The learner hears a whole sentence, types what they heard, and sees word by word what they got wrong. That trains listening and spelling together. All 15,279 approved sentences already have audio.

## Goals

- [x] A learner can practise dictation on purpose from Bài tập, at their level and on a topic they pick
- [x] Dictation is one of the sentence tasks the daily lesson can give, so heard sentences go through the review schedule like the others
- [x] After every check, the learner sees which words they got right, misspelled, missed or added

## Out of Scope

| Feature | Reason |
|---------|--------|
| Speaking or pronunciation scoring | Needs speech recognition (feature 001, Out of Scope) |
| Dictation of whole passages or several sentences in a row | No passage content yet; one sentence per task |
| Choosing the playback speed freely | One normal and one slow speed cover the need (owner, 2026-10-29) |
| New audio, voices or accents | Uses the existing sentence audio |
| Dictation of single words | Already covered by "Nghe và gõ từ" |

## User Stories

### P1: Type a sentence I hear

- As a learner, I want to hear an English sentence and type it so that I train my ear on real sentences instead of reading them
- **Why P1:** The feature itself
- **Independent Test:** Open Bài tập, choose "Nghe chép" at A1, and start a set. The sentence plays without its text being shown. Type it with a missing capital, no full stop and "dont" for "don't". It is marked right.

**Acceptance Criteria:**

- [x] AC-001: WHEN a dictation task opens THEN system SHALL play the sentence's audio once and SHALL NOT show the sentence's English words or its Vietnamese meaning
- [x] AC-002: WHEN the task is open THEN system SHALL offer a replay button and a "Nghe chậm" button that plays the sentence more slowly, both usable any number of times before and after checking
- [x] AC-003: WHEN the task is open THEN system SHALL show how many words the sentence has, as one empty slot per word that fills as the learner types
- [x] AC-004: WHEN the learner checks the answer THEN system SHALL ignore capital letters, punctuation and extra spaces, SHALL accept a contraction and its full form either way ("don't" and "do not"), and SHALL fold text typed with Vietnamese input on back to plain letters, as the word typing exercises do
- [x] AC-005: WHEN every word matches after AC-004 THEN system SHALL mark the answer right
- [x] AC-006: WHEN the only differences are single-letter slips in words of five letters or more, at most one slip per word THEN system SHALL mark the answer right with a slip, which counts as Hard, as typed word recall does. A dropped or added ending ("work" for "works", "watched" for "watch") SHALL never count as a slip, since hearing endings is what dictation trains
- [x] AC-007: WHEN any word is missing, added, in the wrong place or wrong by more than one slip THEN system SHALL mark the answer wrong

### P1: See my mistakes word by word

- As a learner, I want to see exactly which words I missed or misspelled so that I learn which sounds I don't catch
- **Why P1:** Without it the learner only learns that the sentence was wrong, not what they failed to hear
- **Independent Test:** For "She works at a hospital.", type "she work at hospital". The result shows "works" as misspelled ("work"), "a" as missed, and the other words as right, followed by the full sentence and its Vietnamese meaning.

**Acceptance Criteria:**

- [x] AC-008: WHEN an answer is checked THEN system SHALL show the sentence word by word, marking each word as right, accepted with a slip, misspelled (with what the learner typed), or missed, and SHALL show words the learner added that are not in the sentence
- [x] AC-009: WHEN the marks are shown THEN system SHALL tell them apart by text or icon as well as colour, and SHALL give screen readers a short Vietnamese summary ("Đúng 6/8 từ, thiếu 1 từ, sai 1 từ")
- [x] AC-010: WHEN an answer is checked THEN system SHALL show the full English sentence and its Vietnamese meaning

### P1: Practise it from Bài tập and in the daily lesson

- As a learner, I want dictation both as a set I choose and as part of my daily lesson so that I practise listening regularly without having to remember to
- **Why P1:** The owner chose both places (2026-10-29)
- **Independent Test:** Bài tập lists "Nghe chép" among the sentence types and a set of it runs, retries wrong answers and shows the score like the other sets. Over a few daily lessons with sentence tasks, at least one dictation task appears.

**Acceptance Criteria:**

- [x] AC-011: WHEN the learner opens Bài tập THEN system SHALL list "Nghe chép" with the other sentence exercise types, filtered by level and topic in the same way
- [x] AC-012: WHEN a dictation set finishes THEN system SHALL behave like the other sets: score screen, retry of wrong answers (feature 006) and attempts saved to progress
- [x] AC-013: WHEN the daily lesson picks its sentence tasks THEN system SHALL include dictation among the kinds it can choose, and SHALL keep the lesson within its time budget
- [x] AC-014: WHEN a dictation answer is graded THEN system SHALL save the attempt like the other sentence exercises, and after a wrong answer SHALL bring the words and grammar the sentence practises forward to the next review (sentences have no review card of their own)

### P2: A hint when I'm stuck

- As a learner, I want to see the Vietnamese meaning when I can't make out a sentence so that I can still finish it and learn from it
- **Why P2:** Helps weaker listeners, but the task works without it

**Acceptance Criteria:**

- [x] AC-015: WHEN the learner presses "Gợi ý" before checking THEN system SHALL show the sentence's Vietnamese meaning and SHALL record the answer as hinted, as other hints do
- [x] AC-016: WHEN the hint has not been used THEN system SHALL keep the Vietnamese meaning hidden until the answer is checked

## Edge Cases

- WHEN a sentence's audio fails to load or play THEN system SHALL replace the task with a sentence exercise that needs no audio, as the word listening exercise does today, and SHALL not count the failure as a wrong answer
- WHEN a sentence contains digits or abbreviations ("1990", "9 p.m.", "MP3") THEN system SHALL not use it for dictation, since the spoken form can be written several ways
- WHEN the learner checks an empty answer THEN system SHALL not allow the check, as with other typing exercises
- WHEN the learner types more or fewer words than the sentence has THEN system SHALL still allow the check, and the word slots SHALL show the extra or missing count
- WHEN the learner types with Vietnamese input turned on THEN system SHALL warn as the other typing exercises do
- WHEN a sentence has several accepted word orders THEN system SHALL grade dictation against the sentence as spoken in the audio only
- WHEN the learner replays or slows the audio THEN system SHALL not count it as a hint
- WHEN the screen is a phone THEN system SHALL keep the play buttons, word slots and input visible above the keyboard without scrolling sideways

## Success Criteria

- [x] A learner can start a dictation set from Bài tập in two taps and finish a sentence in under a minute
- [x] Every checked answer names each wrong word, so the learner never has to compare the sentences themselves
- [x] Marks are readable without colour and are announced to screen readers in Vietnamese

## Open Questions

None.

## Notes

- Owner decisions (2026-10-29): dictation goes in both Bài tập and the daily lesson; grading is forgiving (capitals, punctuation and contractions ignored, one slip allowed in longer words, counted as Hard); the helps are unlimited replay, slow playback, one slot per word and the Vietnamese meaning as a hint.
- Content at the time of writing: 15,279 approved sentences, all with audio; median 8 words, longest 16; 898 contain a contraction and 63 contain digits.
- The UI name is "Nghe chép"; button labels "Nghe lại", "Nghe chậm" and "Gợi ý".
- Changes during implementation (2026-10-29): AC-006 gained the ending rule after a test showed "work" for "works" passing as a slip; AC-014 was reworded because sentences never had a review card, only the words and grammar they practise.
- Verification (2026-10-29):
  - AC-001 to AC-005, AC-008 to AC-010, AC-015, AC-016: runner tests (clip plays on open at normal speed, then 0.75 and 1 on the buttons; text and meaning hidden; "Câu có 5 từ, bạn đã gõ 3 từ"; forgiving answer right; group named "Đúng 3/5 từ, thiếu 1 từ, sai 1 từ"; hint shows the meaning and the outcome is hinted). In the browser at desktop width: a set from Bài tập loads the clip, shows four slots, marks every word with icon and label after a wrong answer, shows the sentence and meaning, reveals the hint, and marks "speak" for "speaks" as wrong
  - AC-004 to AC-007: 16 grader tests (capitals, punctuation, curly apostrophes, contractions both ways, she's = she has, cannot, hyphens, slips flagged as typo, endings never slips, missing/extra/reordered words wrong)
  - AC-011, AC-012: library test lists "Nghe chép" (dictation.A1.home) only for sentences with audio; sets reuse the existing runner, score screen and retry
  - AC-013: lesson-plan test picks dictation within five days when sentences have audio and never without; the step time (35 s) equals the sentence reserve, so the budget is unchanged
  - AC-014, AC-015: record test saves a hinted dictation attempt as hinted and Hard
  - Edge cases: prepare test gives a word-order fallback and skips sentences with digits or no audio; runner test swaps to word order when the clip fails to load
  - Not checked in a browser: phone width (the window could not be resized) and dictation inside the daily lesson
- Audit (2026-10-29), all Goals and Success Criteria met:
  - Bài tập by level and topic: library test lists dictation.A1.home; in the browser a set started from its "Nghe chép" button on the Bài tập page
  - Daily lesson: lesson-plan test picks dictation within five days when sentences have audio; wrong answers bring the sentence's words and grammar forward (AC-014)
  - Marks after every check: grader and runner tests; the browser showed each word marked with icon and label
  - Two taps and under a minute: in the browser one tap on the set's button opened the first sentence, and a sentence was answered in well under a minute; phone use signed off by the owner when closing the feature
  - Readable without colour and announced in Vietnamese: icon plus a Vietnamese label on every mark, and the group's accessible name is the summary ("Đúng 3/5 từ, thiếu 1 từ, sai 1 từ")

## Baseline

### Current Behavior

- Listening is trained only on single words: hear a word, then pick it among four or type it
- Sentence exercises (put words in order, fill the gap, choose the correct sentence, build the translation) all show either the English words or the Vietnamese meaning, and audio is a help, not the task
- The daily lesson picks its sentence tasks from those four kinds within a time budget
- Bài tập offers each exercise type as a set by level and topic, with retry of wrong answers and a score screen

### Gaps / Limitations

- A learner can do every sentence exercise without listening, so listening to whole sentences is never trained
- Missed word endings and small words (*a*, *the*, *-s*, *-ed*) go unnoticed, since nothing asks the learner to write what they hear
