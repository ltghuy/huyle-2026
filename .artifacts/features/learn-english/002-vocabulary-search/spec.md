---
id: 002
feature: vocabulary-search
type: brownfield
scope: medium
status: done
branch: feature/learn-english
created: 2026-10-27
---

# Feature: Vocabulary search

## Overview

The vocabulary page lists words one level at a time, filtered by topic. A learner who wants a particular word has to guess its level and topic, then scroll. The owner asked for a search box with suggestions that cover every level: typing "ac" should suggest "action", "activity" and so on, whatever level they belong to.

## Goals

- [x] A learner can find any published word from the vocabulary page by typing the start of it, without picking a level first.
- [x] Opening a word from the suggestions shows the same word details as opening it from the list.

## Out of Scope

| Feature | Reason |
|---------|--------|
| Searching by Vietnamese meaning | Not asked for; matching Vietnamese without diacritics needs its own rules |
| Searching grammar topics or sentences | The request is about vocabulary only |
| Filtering the word list below the box by the query | Suggestions already answer "where is this word"; the list keeps its level and topic filters |
| Fuzzy matching of typos | Prefix and substring matching cover the request |

## User Stories

### P1: Find a word from any level

- As a learner, I want to type part of an English word and see matching words from every level so that I can open it without knowing its level.
- **Why P1:** This is the whole request.
- **Independent Test:** On the vocabulary page set to A1, type the start of a word that only exists at A2; it appears in the suggestions with its level, and choosing it opens its details.

**Acceptance Criteria:**

- [x] AC-001: WHEN a learner types at least one letter in the vocabulary search box THEN system SHALL suggest published words from every level whose English headword or spelling variant contains the text, ignoring case
- [x] AC-002: WHEN suggestions are shown THEN system SHALL list words that start with the text before words that only contain it, then easier levels first (A1 before C1), then shorter words, and show at most 8
- [x] AC-003: WHEN suggestions are shown THEN each SHALL show the English word, its word type, its level and its first Vietnamese meaning
- [x] AC-004: WHEN a learner chooses a suggestion (click, tap, or arrow keys and Enter) THEN system SHALL open that word's details, and closing them SHALL return to the page as it was

### P2: Clear feedback while searching

- As a learner, I want to know when the words are still loading or nothing matches so that I am not left looking at an empty box.
- **Why P2:** Without it the box looks broken on a slow connection or a typo.

**Acceptance Criteria:**

- [x] AC-005: WHEN no word matches THEN system SHALL say so in Vietnamese
- [x] AC-006: WHEN the word lists for the search are still loading or could not be loaded THEN system SHALL say so in Vietnamese instead of showing no suggestions

## Edge Cases

- WHEN the text is only spaces THEN system SHALL show no suggestions.
- WHEN a word has been removed from the course THEN system SHALL NOT suggest it.
- WHEN the learner is offline and the word lists were downloaded before THEN system SHALL search the downloaded lists.
- WHEN the learner never focuses the search box THEN system SHALL NOT download the other levels' word lists.

## Success Criteria

- [x] Typing "ac" suggests words such as "action" and "activity" from any level that has them.
- [x] Existing vocabulary page tests still pass, and the new behavior has tests for AC-001 to AC-006.

## Open Questions

- None

## Notes

The request came from the owner on 2026-10-27, with "ac" → "action", "activity" as the example.

## Baseline

### Current Behavior

- The vocabulary page shows level tabs, topic chips with learned counts, and a word list for the chosen level. Choosing a word opens its details over the page.
- A word linked from another page can be opened even if it belongs to a different level.

### Gaps / Limitations

- There is no way to look up a word by spelling. The learner must know or guess its level and topic.
