---
id: 008
feature: irregular-verbs
type: brownfield
scope: large
status: to-review
branch: feature/learn-english
created: 2026-10-28
---

# Feature: Irregular verbs

## Overview

Past Simple, Present Perfect, Past Perfect and the B2 perfect tenses all need
the past and past participle forms of irregular verbs, but the course only
shows them as one-off examples inside grammar explanations ("go → went",
"write, wrote, written"). Learners have nowhere to study the forms, hear them,
or practise them, and nothing brings a forgotten form back for review.

The verbs themselves are already in the course: 107 of the 108 common
irregular verbs are words with a Vietnamese meaning, phonetic spelling, an
example and audio (60 at A1, 23 at A2, 20 at B1, 4 at B2). What is missing is
their forms. This feature adds the forms, a page to study them grouped by
pattern, practice, and their own place in the review schedule.

## Goals

- [x] A learner can look up the past simple and past participle of every common irregular verb, hear each form, and see verbs grouped by how their forms change
- [x] A learner can practise the forms and gets a forgotten form back in Ôn tập, separately from the word's meaning
- [x] Grammar topics that depend on the forms lead to the section

## Out of Scope

| Feature | Reason |
|---------|--------|
| Regular verbs (-ed) | The rule is taught in Past Simple; no list to learn |
| Rarer irregular verbs that are not in the course's word lists (forsake, tread, …) | Owner chose the ~108 common verbs first (2026-10-28); the irregular verbs of the C1 word list were added later (quick task 014) |
| Third person -s, -ing forms | Covered by Present Simple and Present Continuous |
| Irregular verbs in the daily lesson plan | Keeps the lesson within its 15-minute budget; can follow once the section is used |
| British/American differences beyond listing both forms | Both forms are shown; the voice is American |

## User Stories

### P1: Study the forms

- As a learner, I want a list of irregular verbs with their three forms, meaning and pronunciation so that I can learn them in one place
- **Why P1:** The section itself
- **Independent Test:** Open "Động từ bất quy tắc", find "go": go, went, gone with "đi" and a play button for each form

**Acceptance Criteria:**

- [x] AC-001: WHEN a learner opens the section from the menu THEN system SHALL list the common irregular verbs with base form, past simple, past participle, Vietnamese meaning and level
- [x] AC-002: WHEN a verb has more than one accepted form (learnt/learned, got/gotten) THEN system SHALL show all of them and say which is American
- [x] AC-003: WHEN the learner presses a verb's play button THEN system SHALL say its three forms in a row ("go, went, gone") in the app's voice
- [x] AC-004: WHEN the learner chooses a pattern THEN system SHALL show only verbs of that pattern: all three the same (cut–cut–cut), past and participle the same (buy–bought–bought), base and participle the same (come–came–come), all different (go–went–gone)
- [x] AC-005: WHEN the learner filters by level or searches THEN system SHALL narrow the list, matching any of the three forms or the Vietnamese meaning
- [x] AC-006: WHEN the learner opens a verb THEN system SHALL show its forms, phonetic spelling of each form, meaning and an example sentence

### P1: Practise and review the forms

- As a learner, I want to practise the forms and have the ones I forget come back so that I remember them for good
- **Why P1:** Studying a list once doesn't make the forms stick

**Acceptance Criteria:**

- [x] AC-007: WHEN the learner starts practice from the section (all, a level or a pattern) THEN system SHALL give exercises on the forms: type the past or past participle of a base form, choose the right form for a sentence, and listen to the three forms and choose the correctly spelled set among near misses ("go, goed, goed")
- [x] AC-008: WHEN the learner answers a forms exercise THEN system SHALL schedule the verb's forms for review on their own, without changing the review schedule of the word's meaning
- [x] AC-009: WHEN forms are due THEN system SHALL include them in Ôn tập with forms exercises
- [x] AC-010: WHEN the learner types a form THEN system SHALL accept any accepted variant (learnt or learned) and treat a small typo as in other typing exercises
- [x] AC-011: WHEN practice ends with wrong answers THEN system SHALL retry them until all are right, as other practice sets do (feature 006)

### P2: Find the section from grammar

- As a learner, I want grammar topics that use these forms to point me to the list so that I learn them when I need them
- **Why P2:** Discoverability

**Acceptance Criteria:**

- [x] AC-012: WHEN a learner opens Past Simple, Present Perfect or Past Perfect THEN system SHALL show a link to the section
- [x] AC-013: WHEN a verb's word page is opened THEN system SHALL show its forms and a link to the section

### P2: Progress and backups

- As a learner, I want my forms progress kept like the rest of my progress so that I never lose it

**Acceptance Criteria:**

- [x] AC-014: WHEN the learner backs up, restores or syncs THEN system SHALL carry the forms review schedule with everything else
- [x] AC-015: WHEN an older copy of the app (an open tab not yet updated) reads a backup or sync data that contains forms progress THEN system SHALL tell the learner to reload instead of failing silently or dropping data
- [x] AC-016: WHEN the learner opens Hồ sơ THEN system SHALL show how many verbs' forms they have learned per level

## Edge Cases

- WHEN a verb is irregular in one sense and regular in another (hang: hung / hanged; lie: lay–lain / lied) THEN system SHALL show the irregular forms with a short Vietnamese note on the other use
- WHEN a verb's audio is missing THEN system SHALL hide its play button, and listening exercises SHALL skip that verb
- WHEN the owner removes a verb's forms in a later publish THEN system SHALL hide it from the section and practice and keep the learner's progress, as for other removed content
- WHEN content for the section can't load THEN system SHALL show the existing content error with its retry

## Success Criteria

- [x] All 108 common irregular verbs are published with both forms, phonetic spelling of each form and one "base, past, participle" clip each, reviewed by the owner
- [ ] A learner can go from the menu to practising A1 verbs in two taps
- [x] Forms answered wrong come back in Ôn tập the next day, while the word's meaning card keeps its own schedule (tested)

## Open Questions

None.

## Notes

- Owner decisions (2026-10-28): own page in the menu; a separate review card for forms; the 108 common irregular verbs first; "sting" is added to the B2 word list (meaning, phonetic spelling, example, audio, reviewed like any word) so the set is complete; one audio clip per verb saying "base, past, participle".
- With one clip per verb, the listening exercise asks for the spelling of the whole set instead of a single heard form (proposed with the owner's audio choice).
- Forms are drafted in a Claude Code session and reviewed by the owner before publishing, like all course content; phonetic spelling comes from the CMU Pronouncing Dictionary step, audio from the local voice (Kokoro, am_adam).
- Coverage check (2026-10-28): 107 of 108 common irregular verbs are already verbs in the word lists (A1 60, A2 23, B1 20, B2 4); "sting" is missing.
- Owner decision (2026-10-28, after C1 went live): add the irregular verbs of the C1 word list too: oversee, overdraw and shed (quick task 014). The section then has 111 verbs, and its level filter gains C1.

## Evidence

- AC-001, AC-002, AC-004–AC-006: `src/components/verbs/verbs-browser.test.tsx`; `src/learning/verbs.test.ts` (patterns, filters, search without accents); e2e `irregular-verbs.spec.ts`
- AC-007, AC-010: `src/learning/exercises/forms.test.ts` (three kinds, variants, typos, the base form never a typo); runner tests for the three views
- AC-008, AC-009: `src/lib/session/session.test.ts` (a forms answer leaves the word card alone; Ôn tập uses forms kinds); `lesson-plan.test.ts` (the daily lesson leaves forms cards to Ôn tập)
- AC-011: practice runs through `ExerciseRun` with `retryWrong`; e2e plays a verb's practice to "Hoàn thành bài tập"
- AC-012, AC-013: grammar and vocabulary tests; e2e follows the word dialog link to the verb
- AC-014, AC-015: `src/learning/snapshot.test.ts` (version 1 reads as 2, version 3 refused, forms cards kept)
- AC-016: `src/components/profile/profile.test.tsx`; e2e sees "1/2 động từ" after practice
- AC-003: 108 "base, past, participle" clips (Kokoro am_adam) deployed to the words host; sampled clips return 200 audio/mpeg; every live forms item has an audio key (2026-10-28)
- Success criteria audit (2026-10-28): published with IPA and audio for all 108 (live API); forms reviewed apart from the word card (tests). Not met as written: "menu to practising A1 verbs in two taps" takes three (menu item, the A1 tab, "Luyện tập"); "Luyện tập" from the menu page practises all levels in two

## Baseline

### Current Behavior

- Verbs are words like any other: headword, part of speech, phonetic spelling, Vietnamese meanings, examples, audio; no verb forms
- Past Simple says irregular verbs "có dạng riêng cần học thuộc (go → went)"; a Present Perfect practice item explains "write, wrote, written"
- Review cards exist for words and grammar points only

### Gaps / Limitations

- No list of irregular verbs or their forms, no audio for "went" or "gone", no practice or review of forms
