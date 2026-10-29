---
id: 012
feature: specialized-vocabulary
type: brownfield
scope: large
status: in-progress
branch: main
created: 2026-10-29
---

# Feature: Specialized vocabulary sets

## Overview

Many learners study English for their job. Someone who works in IT, recruitment
or an office needs words like "deploy", "candidate", "onboarding", "invoice" and
"meeting minutes", but the course only offers general words grouped by CEFR
level and broad topic. The broad topics ("Công nghệ", "Công việc & nghề
nghiệp", "Kinh doanh & kinh tế") mix work words with everyday ones and spread
them across five levels, and most job jargon isn't in the course at all.

This feature adds specialized vocabulary sets ("Chuyên ngành") to the
vocabulary page. A set is a curated list of about 100 words for one field. It
reuses course words that fit and adds new specialized words, which go through
the same drafting and owner approval as all other content. A learner can follow
a set, and its words then come into Bài học hôm nay and Ôn tập like level words.

The first release has three sets: Công nghệ thông tin (information
technology), Tuyển dụng (recruitment) and Hành chính văn phòng (office
administration).

## Goals

- [ ] A learner can browse three specialized sets of about 100 words each, with the same meaning, phonetic spelling, example and audio as other words
- [ ] A learner can follow a set and learn its words through the daily lesson and review, with progress shown per set

## Out of Scope

| Feature | Reason |
|---------|--------|
| Sets beyond the first three | Owner chose IT, recruitment and office administration first (2026-10-29); more can follow with the same flow |
| Learner-made sets or custom word lists | Needs editing UI and storage of learner content; not asked for |
| Following more than one set at a time | Keeps the daily lesson within its time budget; see decisions.md |
| Specialized grammar, writing tasks or sentence exercises per field | Sets are vocabulary only |
| A CEFR level for new specialized words | Jargon isn't on CEFR word lists; set words are labelled by set instead |
| Placement test questions from sets | The placement test measures general level |

## User Stories

### P1: Browse a set

- As a learner who works in a field, I want to see the words of my field in one list so that I learn the English I use at work
- **Why P1:** The sets themselves
- **Independent Test:** Open Từ vựng, choose Chuyên ngành, pick "Công nghệ thông tin", open "deploy" and hear it with its meaning and example

**Acceptance Criteria:**

- [x] AC-001: WHEN a learner opens Từ vựng THEN system SHALL offer "Chuyên ngành" next to the level choices
- [x] AC-002: WHEN the learner chooses Chuyên ngành THEN system SHALL list the sets with their Vietnamese name, a short description, word count and how many words the learner has learned
- [x] AC-003: WHEN the learner picks a set THEN system SHALL show its words with the same word cards, learned markers and word details (meaning, phonetic spelling, audio, examples) as level words
- [x] AC-004: WHEN a set word is also a course word at a CEFR level THEN system SHALL show its level; WHEN it is a specialized word only THEN system SHALL show the set's name instead of a level
- [x] AC-005: WHEN the learner searches for words THEN system SHALL also find specialized words, the same way it finds other words (the English word or a spelling variant)
- [x] AC-006: WHEN the learner reloads or shares the page THEN system SHALL reopen the same set (and word, if one was open)

### P1: Follow a set

- As a learner, I want my daily lesson to teach the words of my set so that I learn them without picking words by hand
- **Why P1:** Without it, set words are a list to read once and never come back
- **Independent Test:** Follow "Tuyển dụng", start Bài học hôm nay, and get new words from that set; answer them and see them in Ôn tập later

**Acceptance Criteria:**

- [x] AC-007: WHEN the learner chooses "Học bộ này" on a set THEN system SHALL make it the followed set, replacing any set followed before, and say so
- [x] AC-008: WHEN a set is followed THEN Bài học hôm nay SHALL take its new words from that set, in the set's order, skipping words the learner has already learned, with the same daily count and time budget as level words
- [x] AC-009: WHEN the learner answers a set word in a lesson THEN system SHALL schedule it in Ôn tập like any other word
- [x] AC-010: WHEN the learner chooses "Ngừng học bộ này" THEN system SHALL go back to new words from the learner's level, keeping everything already learned and scheduled
- [x] AC-011: WHEN every word of the followed set is learned THEN system SHALL tell the learner the set is finished and go back to new words from their level
- [x] AC-012: WHEN the learner restores data with a sync code or a backup file THEN system SHALL restore the followed set along with the rest of their progress

### P2: Set progress

- As a learner, I want to see how far I am in a set so that I stay motivated
- **Why P2:** Motivation; the list works without it

**Acceptance Criteria:**

- [x] AC-013: WHEN a set is followed THEN the home page SHALL show its name and learned/total words
- [x] AC-014: WHEN the learner opens a set THEN system SHALL show a progress bar of learned/total words

### P1: Content for the three sets

- As the owner, I want the set words drafted and reviewed like the rest of the course so that their quality matches
- **Why P1:** The sets are empty without it

**Acceptance Criteria:**

- [ ] AC-015: WHEN set content is published THEN each of the three sets SHALL hold about 100 approved words (90 to 120), each new specialized word with a Vietnamese meaning, phonetic spelling, at least one example sentence and audio in the app's voice
- [x] AC-016: WHEN a draft specialized word duplicates an existing course word (same word and part of speech) THEN the drafting checks SHALL reject it in favour of reusing the course word
- [x] AC-017: WHEN the owner hasn't approved a set word THEN system SHALL NOT publish it

## Edge Cases

- WHEN a word belongs to two sets (e.g. "deadline" in IT and office administration) THEN system SHALL count it learned in both once it is learned
- WHEN a set word is also a level word the learner already learned THEN system SHALL show it as learned in the set and skip it in the set's lesson words
- WHEN the learner follows a set and also changes their level THEN system SHALL keep the set followed; the level applies again when the set is finished or unfollowed
- WHEN a published set is later removed or a word leaves it THEN system SHALL ignore a removed followed set without an error, keep course words in Ôn tập, and treat specialized words whose content is gone like any removed item
- WHEN set content fails to load THEN system SHALL show the same error and retry as other content, and the daily lesson SHALL fall back to level words for that day
- WHEN the followed set has fewer unlearned words left than the daily count THEN the lesson SHALL fill the rest with level words

## Success Criteria

- [ ] Three sets are live with 90 to 120 approved words each, every new word with meaning, IPA, example and audio
- [ ] A learner can go from Từ vựng to learning a set word in Bài học hôm nay in three taps or fewer
- [ ] The vocabulary page and daily lesson stay within the free-plan limits the app already meets, with no new runtime AI

## Open Questions

- None blocking. Tentative choices are recorded in decisions.md.

## Notes

- Owner decisions (2026-10-29): mixed word source, sets as a followed track, three sets of about 100 words, placed as a tab on Từ vựng. See decisions.md.
- New specialized words are American English, like the rest of the course.
- Vietnamese set names: "Công nghệ thông tin", "Tuyển dụng", "Hành chính văn phòng".

## Baseline

### Current Behavior

- Từ vựng shows words of one CEFR level at a time (A1 to C1), grouped into about 30 broad topics, with a learned count per topic, search across all levels and a word dialog.
- New words enter learning only through Bài học hôm nay, which takes them from the learner's level (10 a day, or 5 when the 15-minute budget is tight). Learned words come back in Ôn tập.
- Each word has exactly one level and one broad topic.

### Gaps / Limitations

- Work words are scattered across levels and mixed with everyday words in broad topics.
- Most job jargon (deploy, onboarding, payroll, shortlist) isn't in the course.
- A learner can't choose to learn words of a field; the lesson only follows level.
