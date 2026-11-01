---
id: 015
feature: merge-tile-exercises
type: brownfield
scope: medium
status: done
branch: main
created: 2026-11-01
---

# Feature: One tile exercise instead of two

## Overview

The sentence exercises have two types that look and work the same: "Sắp xếp câu" (put the shuffled words in order) and "Dịch bằng thẻ từ" (translate by arranging word tiles). Both show the Vietnamese sentence, give the English words of the sentence plus 2 extra words, and accept the same orders. Only the heading text differs. The owner noticed the duplicate on 2026-11-01 and asked to merge them. "Sắp xếp câu" stays because its extra words are better: they come from the sentence's reviewed wrong variants first ("has" for "I have a dog"), so they test grammar, and it can always be built.

## Goals

- [x] Learners meet one tile exercise, "Sắp xếp câu", in lessons, Ôn tập and the exercise library; "Dịch bằng thẻ từ" no longer appears anywhere
- [x] Data saved before the change (lessons in progress, answer history, sync codes, stats) still loads and works

## Out of Scope

| Feature | Reason |
|---------|--------|
| Changing how "Sắp xếp câu" looks, picks extra words or grades | The kept exercise already works; only the duplicate goes |
| Rewriting old answer history or stats to the new type | Old records stay valid as they are |
| New sentence exercise types | Separate request |

## User Stories

### P1: No duplicate exercise

- As a learner, I want each sentence exercise to be a different task so that practice time isn't spent doing the same thing twice
- **Why P1:** It is the whole request
- **Independent Test:** Open /exercises, sentence group, and check the type filter; run several daily lessons and check the sentence part

**Acceptance Criteria:**

- [x] AC-001: WHEN a daily lesson picks a sentence task THEN system SHALL pick at random from put the words in order, fill in the missing word, choose the correct sentence, dictation and find the error, and SHALL never plan "Dịch bằng thẻ từ"
- [x] AC-002: WHEN a learner opens the exercise library THEN system SHALL offer "Sắp xếp câu" and SHALL NOT list a "Dịch bằng thẻ từ" type or its sets

### P1: Old data keeps working

- As a returning learner, I want a lesson I started before the change to open normally so that I don't lose progress
- **Why P1:** Progress lives only in the learner's browser and sync codes; breaking it loses work
- **Independent Test:** Load a saved lesson or sync snapshot that contains a "Dịch bằng thẻ từ" step

**Acceptance Criteria:**

- [x] AC-003: WHEN a saved lesson contains a "Dịch bằng thẻ từ" step THEN system SHALL show a "Sắp xếp câu" exercise for the same sentence in its place
- [x] AC-004: WHEN a sync snapshot, answer history or stats entry recorded "Dịch bằng thẻ từ" THEN system SHALL accept it as before

## Edge Cases

- WHEN a sentence has no wrong variants and the word pool has too few other words THEN system SHALL still build "Sắp xếp câu" with fewer extra tiles (as today), so no sentence loses its tile exercise
- WHEN an old browser tab still running the previous version sends stats with "Dịch bằng thẻ từ" counts THEN system SHALL accept them

## Success Criteria

- [x] No learner-facing text says "Dịch bằng thẻ từ" or "Dịch câu sau sang tiếng Anh" after the change
- [x] Typecheck, lint, unit tests and build pass

## Open Questions

- None

## Notes

Changes AC-033 of feature 001: the fourth kind there ("translate a Vietnamese sentence by arranging given word tiles") is the one removed.

## Baseline

### Current Behavior

- Daily lessons and the exercise library offer six sentence exercise types, two of which are the same tile task under different names
- "Dịch bằng thẻ từ" takes its 2 extra words only from other words of the level, and is skipped for a sentence when there aren't 2 to pick from
- "Kiểm tra" unlocks for "Sắp xếp câu" once every word slot is filled, and for "Dịch bằng thẻ từ" after any 2 tiles

### Gaps / Limitations

- Learners see the same task twice with different headings, which looks like a mistake and wastes lesson time
