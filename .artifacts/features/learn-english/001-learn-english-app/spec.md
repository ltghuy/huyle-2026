---
id: 001
feature: learn-english-app
type: greenfield
scope: complex
status: in-progress
branch: main
created: 2026-10-26
---

# Feature: Learn English app

## Overview

Vietnamese speakers who study English on their own juggle several tools: a word
list, a dictionary for pronunciation, a grammar book, a flashcard app. None of
them knows what the learner already forgot, and none explains mistakes in
Vietnamese. Words get "learned" once and are gone a week later.

Learn English is a new app, separate from the portfolio and the handbook, with
its own address. Everything a learner needs sits in one place: graded
vocabulary, grammar and tenses with examples, exercises, and a daily lesson
plan. Reviews are scheduled for the moment a word or rule is about to be
forgotten. The interface is in Vietnamese; only the English being taught
(words, example sentences, grammar terms used in the curriculum) appears in
English.

There is no sign-in. Anyone can open the app and start straight away. Progress
(review schedule, attendance points, streak, hard words, level) is saved in the
learner's own browser. To move devices, the learner can either turn on sync,
which gives them a code to enter on the other device, or use a backup file.
Keeping the app account-free also keeps it within free hosting.

The running app uses no AI. Exercises, including sentence construction, are
put together at random from reviewed content and checked against fixed answers.
Content lives in a database the owner can update without releasing a new
version of the app. Anonymous usage counts show how the app is used.

## Goals

- [ ] A new learner can open the app, take the placement test and finish their first daily lesson in under 15 minutes
- [ ] Every word in the vocabulary (levels A1–C1) has a Vietnamese meaning, phonetic spelling, at least one example sentence and audio in the app's voice (American English, male)
- [ ] Words and grammar points come back for review on a forgetting-curve schedule, and a learner who studies daily sees each item at growing intervals instead of all at once
- [ ] Learners can see and drill the words they get wrong most often or take longest to recall
- [ ] Sentence-construction tasks are generated from the content and checked instantly, with the correct answer and a Vietnamese explanation shown
- [ ] A learner can continue on another device with a sync code, without creating an account
- [ ] The owner can add or correct words and lessons, and learners see the change without a new app release

## Out of Scope

| Feature | Reason |
|---------|--------|
| Accounts, sign-in | Dropped to keep hosting free (owner, 2026-10-26); sync codes and backup files cover moving devices |
| AI in the running app (grading written answers, generating exercises) | Dropped to reduce complexity and running cost (owner, 2026-10-26); content is AI-drafted once during development and reviewed |
| Leaderboards, rankings, social features | Points + streak only (decision) |
| Points unlocking content | Points are a motivation signal, not a gate |
| Speaking practice / pronunciation scoring | Needs speech recognition; later phase |
| Native mobile apps | Responsive web first |
| Languages other than English; UI languages other than Vietnamese | Single audience |
| Paid plans, payments | Not a commercial product yet |
| Content authoring UI (admin panel) | Content is drafted and reviewed outside the app, then published to the content database by the owner |
| Usage stats dashboard inside the app | The owner reads usage counts with a report command |
| Detailed design of written assignment types | User will define them later; MVP ships sentence construction + one short-writing type |
| Words above C1 | Source list stops at C1 |

## User Stories

### P1: Start without an account and keep progress

- As a learner, I want to start learning immediately and have my progress kept on my device, with a way to back it up, so that I don't lose my work.
- **Why P1:** Every other feature saves progress; without it nothing builds up.
- **Independent Test:** Open the app in a fresh browser, learn 5 words, close and reopen: the words are still learned. Export a backup, open the app in another browser, import it: the same 5 words, points and streak appear.

**Acceptance Criteria:**

- [x] AC-001: WHEN a visitor opens the app THEN system SHALL let them use every feature without signing in or giving any personal details
- [x] AC-002: WHEN a visitor opens the app for the first time in a browser THEN system SHALL offer the placement test before anything else (skippable)
- [x] AC-003: WHEN audio plays in any lesson type THEN system SHALL use the same American English male voice; there SHALL be no accent or voice choice -- VERIFIED (2026-10-27: every A1 clip generated with Kokoro am_adam; settings have no voice option)
- [x] AC-004: WHEN any screen is shown THEN system SHALL show all interface text (menus, buttons, instructions, feedback, errors) in Vietnamese, with only taught English content in English
- [x] AC-005: WHEN a learner makes progress (answers, lessons, settings) THEN system SHALL save it on their device immediately, so closing the page loses nothing
- [x] AC-042: WHEN a learner chooses "Xuất tiến độ" (export progress) in settings THEN system SHALL download one backup file containing all their progress and settings
- [x] AC-043: WHEN a learner chooses "Nhập tiến độ" (import progress) and picks a valid backup file THEN system SHALL show what the file contains (date, words learned, points) and, after confirmation, replace the current progress with it
- [x] AC-044: WHEN a learner chooses to reset progress THEN system SHALL ask for confirmation, suggest exporting first, and then clear everything on that device

### P1: Vocabulary with pronunciation

- As a learner, I want to study new words grouped by level with meaning, pronunciation and examples so that I learn words I will actually use.
- **Why P1:** Vocabulary is the core content every other feature (review, exercises, curriculum) builds on.
- **Independent Test:** Open a word from level A2, see its Vietnamese meaning, phonetic spelling, word type and example; tap play and hear it read aloud.

**Acceptance Criteria:**

- [x] AC-006: WHEN a learner browses vocabulary THEN system SHALL group words by CEFR level (A1, A2, B1, B2, C1) and by topic, and SHALL show which words the learner has already learned
- [x] AC-007: WHEN a learner opens a word THEN system SHALL show the English word, American phonetic spelling, word type, Vietnamese meaning(s), and at least one English example sentence with its Vietnamese translation
- [x] AC-008: WHEN a learner taps the play button on a word or example sentence THEN system SHALL play it in the app's voice within 1 second on a normal connection -- VERIFIED (2026-10-27 on production: first tap fetched the word and sentence clips in about 0.75 s; clips are cached for a year after that)
- [x] AC-045: WHEN a learner opens the credits page THEN system SHALL list the sources of the word lists and pronunciation data with their licences and required attributions
- [x] AC-009: WHEN a learner marks a word as learned (or completes it in a lesson) THEN system SHALL add it to their review schedule

### P1: Spaced-repetition review

- As a learner, I want words and grammar points to come back just before I would forget them so that I remember them long-term without reviewing everything every day.
- **Why P1:** This is the main reason to use the app over a plain word list.
- **Independent Test:** Learn 10 words today, answer some right and some wrong; tomorrow's review contains the wrong ones, and correctly answered ones reappear at a later date.

**Acceptance Criteria:**

- [x] AC-010: WHEN a learner answers a review item THEN system SHALL record whether it was correct and how long the answer took, and SHALL schedule the next review: a correct, fast answer pushes it further out; a wrong answer brings it back soon (same or next day)
- [x] AC-011: WHEN a learner opens the review screen THEN system SHALL show how many items are due today and let them review them in one session
- [x] AC-012: WHEN an item is reviewed THEN system SHALL test it with a varied exercise type (multiple choice, fill missing letters, listening, meaning recall) instead of always the same one
- [x] AC-013: WHEN the learner studies grammar points THEN system SHALL schedule them for review the same way as words

### P1: Daily curriculum and attendance points

- As a learner, I want a ready-made lesson each day that mixes review and new material so that I know exactly what to study and can build a habit.
- **Why P1:** The structured daily plan ties all features together and is what brings learners back daily.
- **Independent Test:** Open today's lesson, complete all parts, receive attendance points, and see the streak increase by one; reopening the lesson does not award points again.

**Acceptance Criteria:**

- [x] AC-014: WHEN a learner opens the home screen THEN system SHALL show today's lesson made of, in order: review of due vocabulary and grammar, new vocabulary, a grammar point (when scheduled), sentence construction, and a written assignment, with multiple-choice questions mixed into the parts, sized to take about 15 minutes at most (quick task 011)
- [x] AC-015: WHEN a learner completes every part of today's lesson THEN system SHALL award attendance points once for that day and increase the streak by one
- [x] AC-016: WHEN a learner leaves a lesson partway THEN system SHALL save their place and resume from the same part when they return the same day
- [x] AC-017: WHEN a learner views their profile THEN system SHALL show total points, current streak, longest streak and a calendar of days attended
- [x] AC-018: WHEN a day passes without a completed lesson THEN system SHALL reset the current streak to zero on the next visit and keep the longest streak

### P2: Placement test

- As a new learner, I want a short test that finds my level so that I don't waste time on words I already know or get lost in ones that are too hard.
- **Why P2:** Learners can start at A1 without it; the test improves the starting point.

**Acceptance Criteria:**

- [x] AC-019: WHEN a learner starts the placement test THEN system SHALL ask questions across levels A1–C1 and finish in at most 30 questions or 10 minutes
- [x] AC-020: WHEN the test ends THEN system SHALL show the estimated level with a Vietnamese explanation and start the curriculum at that level
- [x] AC-021: WHEN a learner skips the test THEN system SHALL start them at A1 and let them take the test later from settings
- [x] AC-022: WHEN a learner changes their level manually in settings THEN system SHALL use the new level for new vocabulary from the next lesson

### P2: Grammar and tenses

- As a learner, I want grammar and tense lessons explained in Vietnamese with English examples so that I understand the rule and see it used.
- **Why P2:** Core content, but vocabulary + review already deliver value on their own.

**Acceptance Criteria:**

- [x] AC-023: WHEN a learner opens the grammar section THEN system SHALL list grammar topics (including all 12 English tenses) grouped by level, with progress shown per topic
- [x] AC-024: WHEN a learner opens a grammar topic THEN system SHALL show the rule explained in Vietnamese, the sentence pattern, when to use it, signal words, common mistakes, and English examples with Vietnamese translations that can be played aloud
- [x] AC-025: WHEN a learner finishes a grammar topic THEN system SHALL offer a short practice and add the topic to the review schedule

### P2: Exercise library

- As a learner, I want a list of exercises covering everything in the app so that I can practise any area on my own outside the daily lesson.
- **Why P2:** Self-directed practice complements the daily plan.

**Acceptance Criteria:**

- [x] AC-026: WHEN a learner opens the exercise library THEN system SHALL list exercises for every vocabulary level/topic and every grammar topic, filterable by level, topic and exercise type
- [x] AC-027: WHEN a learner does a fill-missing-letters exercise THEN system SHALL show the word with some letters replaced by blanks (e.g. "ho_ewo_k" for "homework") plus its Vietnamese meaning and an audio hint, and SHALL accept the answer only when every blank is correct
- [x] AC-028: WHEN a learner does a multiple-choice question THEN system SHALL show 4 options with exactly one correct answer, and after answering SHALL show which was correct with a short Vietnamese explanation
- [x] AC-029: WHEN a learner finishes any exercise THEN system SHALL show the score and feed each answered item's result into the review schedule

### P2: Hard words list

- As a learner, I want to see the words I keep getting wrong or take long to recall so that I can focus on them.
- **Why P2:** Turns review data into a targeted study list.

**Acceptance Criteria:**

- [x] AC-030: WHEN a word has been answered wrong repeatedly or recalled slowly (thresholds in Notes) THEN system SHALL add it to the learner's hard words list with the reason shown (often wrong / slow to recall)
- [x] AC-031: WHEN a learner opens the hard words list THEN system SHALL sort words by difficulty and let them start a practice session with only those words
- [x] AC-032: WHEN a hard word is answered correctly and quickly several times in a row THEN system SHALL remove it from the list

### P2: Sentence construction and written assignments

- As a learner, I want to build English sentences and get an instant check so that I practise producing English, not only recognising it.
- **Why P2:** Producing language is the step learners skip most.

**Acceptance Criteria:**

- [x] AC-033: WHEN a learner gets a sentence construction task THEN system SHALL pick one at random from these kinds, built from reviewed example sentences that use today's words or grammar point: put shuffled words in the right order, fill in the missing word, choose the one correct sentence among 4, or translate a Vietnamese sentence by arranging given word tiles
- [x] AC-034: WHEN a learner submits a sentence THEN system SHALL check it instantly against the accepted answer(s), and SHALL show the correct sentence, its Vietnamese translation, a play button and, when wrong, a short Vietnamese explanation from the related grammar point
- [x] AC-035: WHEN a wrong answer relates to a word or grammar point in the app THEN system SHALL link to it and bring that item forward in the review schedule
- [x] AC-036: WHEN a learner gets a free-writing assignment THEN system SHALL show a Vietnamese prompt, take their text, then show one or more model answers and let the learner mark their own answer as right or wrong; that mark counts like any other answer

### P2: First-visit guided tour

- As a new learner, I want a short guided tour the first time I use the app so that I know what each part does and where to start.
- **Why P2:** The app is usable without it, but a tour shortens the first session and helps learners find review, hard words and the exercise library.

**Acceptance Criteria:**

- [x] AC-038: WHEN a learner reaches the home screen for the first time (after the placement test or skipping it) THEN system SHALL show a Vietnamese welcome dialog with a one-paragraph overview of the app and two choices: start the tour or skip (since feature 003 it waits for the learner's name and greets them by it)
- [x] AC-039: WHEN the learner starts the tour THEN system SHALL highlight the main areas one at a time (daily lesson, vocabulary, grammar, review, exercise library, hard words, profile and points, settings), each with a short Vietnamese explanation and a step counter, and let them go back, go next or close at any step
- [x] AC-040: WHEN the learner finishes, skips or closes the tour THEN system SHALL not show the welcome dialog or tour again in that browser (or after importing a backup in which it was already seen)
- [x] AC-041: WHEN the learner chooses "Xem lại hướng dẫn" (replay tour) in settings or help THEN system SHALL start the tour again from the first step

### P2: Sync progress with a code

- As a learner, I want to continue on another device without creating an account so that switching from phone to laptop doesn't lose my progress.
- **Why P2:** Backup files work but are clumsy on phones; a code is quicker.

**Acceptance Criteria:**

- [x] AC-047: WHEN a learner turns on sync in settings THEN system SHALL create a sync code that is easy to read and type, show it with a copy button, explain in Vietnamese that anyone with the code can see and change this progress, and upload the current progress
- [x] AC-048: WHEN sync is on and progress changes THEN system SHALL upload the change within a minute while online, and as soon as the connection returns when offline
- [x] AC-049: WHEN a learner enters a sync code on another device THEN system SHALL show what the synced progress contains (words learned, points, last updated) and, after confirmation, link the device and keep it in sync from then on
- [x] AC-050: WHEN two linked devices both changed progress since they last synced THEN system SHALL combine the changes without losing any answer or attendance day and without awarding a day's points twice
- [x] AC-051: WHEN a learner turns sync off on a device THEN system SHALL unlink that device; WHEN they choose "delete synced data" THEN system SHALL remove the stored progress from the server after confirmation

### P1: Content updates without a new release

- As the owner, I want to publish new or corrected words, grammar topics and sentences to the app so that learners get them without me releasing a new version.
- **Why P1:** The app depends on thousands of reviewed content items that will be fixed and extended over time.
- **Independent Test:** Correct one word's Vietnamese meaning, publish, reload the word in the app within 10 minutes: the new meaning shows.

**Acceptance Criteria:**

- [x] AC-052: WHEN the owner publishes reviewed content THEN learners SHALL see it within 10 minutes without a new app release
- [x] AC-053: WHEN content is published THEN system SHALL make only items marked as reviewed visible to learners
- [x] AC-054: WHEN a published item that learners have already studied is removed THEN system SHALL keep their progress for it and simply stop showing it in lessons and lists
- [x] AC-055: WHEN content cannot be loaded (offline or server error) THEN system SHALL use the content it downloaded last time, and show a Vietnamese message only if it has none

### P3: Anonymous usage stats

- As the owner, I want anonymous counts of how the app is used so that I can see which features are used and which words learners miss most.
- **Why P3:** Useful for improving content, not needed for learners.

**Acceptance Criteria:**

- [x] AC-056: WHEN learners use the app THEN system SHALL count, per day: lessons completed, active devices, exercises answered per type, and how often each word is answered wrong, without collecting names, contact details, IP addresses or anything that identifies a person
- [x] AC-057: WHEN a learner turns off "Gửi thống kê ẩn danh" (send anonymous stats) in settings THEN system SHALL stop sending any usage data from that device
- [x] AC-058: WHEN the owner runs the stats report THEN system SHALL show the counts for a chosen date range

### P3: Progress insights

- As a learner, I want to see how many words I know per level and how my accuracy changes so that I stay motivated.
- **Why P3:** Nice to have; points and streak already cover motivation for MVP.

**Acceptance Criteria:**

- [x] AC-037: WHEN a learner opens progress THEN system SHALL show words learned per level, grammar topics completed, and review accuracy over the last 30 days

## Edge Cases

- WHEN a learner comes back after several days away THEN system SHALL cap the number of reviews in one day's lesson and spread the backlog over the following days instead of showing hundreds at once
- WHEN a day boundary is calculated (lesson, streak, due reviews) THEN system SHALL use the learner's own time zone, defaulting to Vietnam time
- WHEN a learner has the app open in two tabs and completes today's lesson in both THEN system SHALL award attendance points once
- WHEN the browser does not allow saving data (e.g. some private modes) THEN system SHALL warn in Vietnamese that progress will not be kept and suggest exporting a backup before closing
- WHEN an imported file is not a valid backup, is damaged, or comes from a newer app version that this version cannot read THEN system SHALL reject it with a Vietnamese message and leave current progress untouched
- WHEN a backup from an older app version is imported THEN system SHALL upgrade it and keep all progress
- WHEN the learner has not exported a backup for 14 days and has meaningful progress THEN system SHALL show a gentle reminder to export
- WHEN audio cannot be loaded THEN system SHALL show a Vietnamese message and keep the exercise usable (listening items are skipped or swapped for another type)
- WHEN a sentence has more than one correct word order (e.g. a movable time phrase) THEN system SHALL accept every order listed as accepted for that sentence
- WHEN a sentence contains the same word twice THEN system SHALL accept either tile in either position
- WHEN a free-writing answer is empty THEN system SHALL ask the learner to write something before showing the model answer
- WHEN a learner enters a sync code that does not exist THEN system SHALL say so in Vietnamese; WHEN codes are entered wrongly many times in a row from one network THEN system SHALL make them wait before trying again
- WHEN sync fails (offline, server error) THEN system SHALL keep working on local progress and retry later, showing the last successful sync time in settings
- WHEN synced data has not been touched for 12 months THEN system SHALL delete it from the server
- WHEN sending usage stats fails THEN system SHALL drop them silently and never block learning
- WHEN a fill-missing-letters word has 3 letters or fewer THEN system SHALL hide only one letter; WHEN it contains spaces, hyphens or apostrophes THEN system SHALL never blank those characters
- WHEN a word has several valid spellings (British vs American, e.g. colour/color) THEN system SHALL show the American spelling and accept both in answers
- WHEN a learner answers a multiple-choice question THEN system SHALL never offer two options that are both correct (e.g. synonyms of the target meaning)
- WHEN the learner has learned every word at their level THEN system SHALL suggest moving up a level
- WHEN a tour step points at an area that is hidden or collapsed on the current screen size (e.g. a menu on a phone) THEN system SHALL open that area or show the step as a centred dialog instead of pointing at nothing
- WHEN the tour is open THEN system SHALL be fully usable by keyboard (Esc closes, arrow keys move between steps) and announce each step to screen readers
- WHEN a learner closes the browser mid-tour THEN system SHALL treat the tour as seen and not force it again

## Success Criteria

- [ ] New learner reaches the end of their first daily lesson in under 15 minutes (measured in usability test with 3 people)
- [ ] 100% of A1–C1 words have Vietnamese meaning, phonetics, an example and audio before launch
- [ ] Audio starts in under 1 second for a previously played word, under 3 seconds for a first play
- [ ] Sentence answers are checked in under 100 ms (no server round trip)
- [ ] Attendance points are never awarded twice for the same day (zero duplicates in test)
- [ ] Export then import into a fresh browser restores 100% of progress (words, schedule, points, streak, hard words, settings)
- [ ] Progress made on one device appears on a linked device within 2 minutes when both are online
- [ ] A content correction is visible to learners within 10 minutes of publishing
- [ ] The app runs within the hosting free tier at launch traffic, with zero AI running cost
- [ ] All interface text is in Vietnamese (manual check of every screen)
- [ ] A first-time learner sees the welcome dialog exactly once and can complete the tour in under 2 minutes

## Open Questions

- Written assignment types beyond sentence construction: to be defined later by the user.

## Notes

- Decisions from discovery (2026-10-26): vocabulary graded A1–C1; audio in a single American English male voice, the same on every device (generated once and reused); a new standalone app with its own address; content (Vietnamese meanings, examples, grammar lessons) is AI-drafted and reviewed by the owner before release; written answers were first meant to get AI feedback (dropped, see below); placement test A1–C1; points + streak only; a first-visit welcome dialog and guided tour (added 2026-10-26). See decisions.md.
- Proposed hard-word thresholds: wrong in at least 3 of the last 8 attempts, or average recall time over 8 seconds across the last 5 attempts; removed after 4 correct answers in a row under 5 seconds.
- "Stanford" in the original request was clarified to mean the Oxford 3000/5000 list. Research then found that list is copyrighted with no open licence, so the app ships openly licensed CEFR-graded lists instead (owner, 2026-10-26); the credits page carries their attributions.
- Revised by the owner (2026-10-26): no sign-in, so the app stays within free hosting. Progress lives on the learner's device with an export/import backup file. Then (same day) AI was dropped from the running app: sentence tasks are generated from reviewed content with fixed answers, free writing is self-checked against model answers. The owner kept a backend and database for three jobs: serving content (updatable without a release), sync codes, and anonymous usage counts.
- AC-046 (bot check for AI feedback) was retired with the AI feedback; its ID is not reused.
- Proposals accepted by the owner (2026-10-26):
  - Daily lesson: 10 new words; at most 50 reviews (backlog beyond that rolls to later days). Revised 2026-10-28 (quick task 011): the lesson also fits a 15-minute budget of estimated seconds per exercise kind; due reviews fill the time left after the fixed parts, and new words drop to 5 when they don't all fit.
  - Attendance: 10 points per completed day; +20 bonus when the streak reaches 7, 30 and 100 days.
  - Address: english.huyle.work.
