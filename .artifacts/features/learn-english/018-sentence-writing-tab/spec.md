---
id: 018
feature: sentence-writing-tab
type: brownfield
scope: medium
status: done
branch: main
created: 2026-11-03
---

# Feature: "Viết câu" tab with topic practice

## Overview

The third tab of the exercise library, "Mẫu câu", holds a single card, "Chủ đề khác", with every sentence of the level (1220 at A1). Sentences have no topic of their own, so the topic filter has only one entry and learners can't practise sentences about one subject. Most sentences do teach a word that has a topic, though. This feature renames the tab "Viết câu", groups its sentences by topic, and makes it a writing tab: each topic has one 10-step "Dịch câu" practice (typing the English for a Vietnamese sentence). The old all-sentences card moves to the end of the "Từ vựng" tab with the other five sentence types.

## Goals

- [x] A learner can pick a level and a topic in "Viết câu" and translate 10 sentences from that topic
- [x] The other sentence types over all sentences stay available, now in "Từ vựng"

## Out of Scope

| Feature | Reason |
|---------|--------|
| A topic field on sentence content | The word's topic is enough; no content change or re-review needed |
| Other sentence types in "Viết câu" | The owner wants this tab for writing only (2026-11-03: a first version mixed all six types; replaced) |
| Choosing the number of steps | Fixed at 10, like every library set |

## User Stories

### P1: Translate the sentences of one topic

- As a learner, I want to write sentences about one subject at my level so that I practise using that subject's words
- **Why P1:** it is the point of the change
- **Independent Test:** open "Viết câu", pick A1 and a topic, start the practice, see up to 10 "Dịch câu" steps, all from sentences whose word has that topic

**Acceptance Criteria:**

- [x] AC-001: WHEN a learner opens the exercise library THEN system SHALL name the third tab "Viết câu" (the `?tab=sentence` links keep working)
- [x] AC-002: WHEN "Viết câu" is shown for a level THEN system SHALL show one card per topic, where a sentence's topic is its own topic if it has one, else the topic of the first of its words that has one, then a "Chủ đề khác" card for the sentences with no topic, each with one "Luyện viết" button (its run is titled "Luyện viết: <topic>"), and SHALL offer the level tabs and the topic filter but no type filter
- [x] AC-003: WHEN a learner starts a topic's practice THEN system SHALL run up to 10 "Dịch câu" steps, one per sentence of that topic in random order
- [x] AC-004: WHEN a learner taps "Làm lại" THEN system SHALL draw a new set of sentences from the same topic

### P2: Keep the all-sentences practice

- As a learner who used the per-type sentence practice, I want the other types to still exist so that I can drill one exercise type
- **Why P2:** removing it would take away a practice learners already have

**Acceptance Criteria:**

- [x] AC-005: WHEN "Từ vựng" is shown for a level THEN system SHALL list, after the word topics, a "Chủ đề khác" card with every sentence of the level, one button per word exercise type (meaning quiz, missing letters, listening, recall) over the level's words those sentences use, and one button per sentence exercise type except "Dịch câu" (word order, gap, choose the sentence, dictation, find the error), which the topic filter ("Chủ đề khác") and the type filter (those types are added to it) reach. The card reads "N từ · M câu" (word types added by quick 045 on 2026-11-04)
- [x] AC-006: WHEN a learner follows an old link to a per-type sentence set (`?id=word-order.A1.khac`, `?type=dictation`) THEN system SHALL open that set or filter in "Từ vựng"; `?type=translate` and `?id=translate.A1.khac` open in "Viết câu"

## Edge Cases

- WHEN none of a sentence's words has a topic (or none is loaded at that level) THEN system SHALL put it in the "Chủ đề khác" card of "Viết câu"
- WHEN a topic has fewer than 10 sentences that can make an exercise THEN system SHALL run one step per sentence
- WHEN a level has no sentences THEN system SHALL show the existing empty state in "Viết câu"

## Success Criteria

- [x] At A1, "Viết câu" lists more than 10 topics and each practice runs 10 "Dịch câu" steps
- [x] The library tests and the quality gates pass

## Open Questions

- None

## Notes

Requested by the owner on 2026-11-03 with a screenshot of the current tab. Each library set already ran at most 10 steps. The owner picked one 10-step practice per topic and moving the all-sentences card to "Từ vựng". After seeing the first version, which mixed all six types, they asked for "Dịch câu" only in "Viết câu" and the other five types in "Từ vựng".

## Baseline

### Current Behavior

- "Mẫu câu" shows one "Chủ đề khác" card per level with six buttons, one per sentence type; each runs up to 10 steps of that type over all the level's sentences
- The topic filter in that tab has only "Chủ đề khác"

### Gaps / Limitations

- Learners can't practise sentences by subject, and the tab's topic filter does nothing useful


## Verification

- 2026-11-03 (after the owner's change to "Dịch câu" only): `pnpm lint`, `pnpm typecheck`, `pnpm test` (894 passed; one unrelated `sync-client` timing test failed once and passed on 3 reruns) and `pnpm build` pass. Tests in `src/components/library/exercise-library.test.tsx` cover AC-001 to AC-006.
- In the browser at A1: "Viết câu" lists 27 cards with only the topic filter, each with one "Dịch câu" button, and "Chủ đề khác · 56 câu" last; "Con người & gia đình" opens `translate.A1.people-family` at 1/10. "Từ vựng" → "Chủ đề khác · 1220 câu" shows Sắp xếp câu, Điền từ vào câu, Chọn câu đúng, Nghe chép, Tìm lỗi sai, without Dịch câu.
