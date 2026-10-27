---
id: 001
feature: learn-english-app
created: 2026-10-26
---

# Decisions: Learn English app

Decisions on gray areas and ambiguities resolved during discussion.

## Resolved

### Users and progress storage

- **Question:** Single user, local-only, or multi-user with accounts?
- **Decision (revised 2026-10-26):** No sign-in. Progress is stored in the learner's browser, with an export/import backup file. No server database for learner data.
- **Rationale:** First decided as multi-user with sign-in. Research showed signed-in, dynamic pages would likely not fit the Workers free plan (10 ms CPU, 50 DB queries per request). The owner chose to drop sign-in to stay free; without accounts nearly every page can be prebuilt, like the handbook.
- **Caveats:** No automatic cross-device sync; clearing browser data loses progress unless a backup was exported. Adding optional accounts later stays possible: the backup file format becomes the sync payload.

### Backend and database role (no AI, no accounts)

- **Question:** With no sign-in and no AI grading, what is the backend for?
- **Decision (2026-10-26):** Keep a small backend with a database for three jobs: (1) serve content, so reviewed words, grammar and sentences can be published without an app release; (2) sync codes, so learners can move between devices without an account; (3) anonymous daily usage counts, with a per-device opt-out.
- **Rationale:** Owner's choice. All three fit the free plan because they are short database reads and writes behind cached responses.
- **Caveats:** A sync code is a bearer secret. Anyone holding it can read and change that progress, and the UI says so.

### Vocabulary source

- **Question:** The request said "Stanford"; Stanford has no public vocabulary API.
- **Decision (revised 2026-10-26):** CEFR-J Wordlist 1.5 (A1–B2) plus Octanove C1 list, enriched with Vietnamese meanings, American phonetics and examples. Credits page with attributions.
- **Rationale:** Oxford 3000/5000 was first chosen, but it is copyrighted by Oxford University Press with no open licence (see `.artifacts/research/learn-english-tts-and-word-data.md`). CEFR-J allows commercial use with a citation; Octanove C1 is CC BY-SA 4.0.
- **Caveats:** Octanove's share-alike licence means the derived C1 word data we publish must stay CC BY-SA 4.0.

### Text-to-speech

- **Question:** Device voices vs generated audio? Which voices?
- **Decision:** Generated audio in one voice, American English male, created once and cached. No accent or voice setting. Phonetics and displayed spelling follow American English; British spellings are still accepted in answers.
- **Rationale:** Device voices vary between devices. Cutting from 4 voices (UK/US × male/female) to 1 removes the settings screen and quarters audio generation and storage (owner's call, 2026-10-26, to reduce complexity).
- **Caveats:** Small running cost; pre-generate for the word list to keep first-play latency low. Adding voices later means regenerating audio only, not changing lessons.

### Audio hosting

- **Question:** Where do the audio clips live, given the owner wants everything free with no card on file?
- **Decision (2026-10-27):** Two static-files-only Workers, one for word clips and one for sentence clips, at `audio-words.huyle.work` and `audio-sentences.huyle.work`.
- **Rationale:** R2 asks for a payment method before it can be enabled, even within its free tier. Requests to Worker static assets are free and unlimited and storing them costs nothing. The free plan caps a Worker at 20,000 files, and ~24k clips are needed, so they are split by kind.
- **Caveats:** Adding audio means redeploying the audio Workers (`pnpm content:audio deploy`). If either kind passes 20,000 clips, add a third Worker or trim examples.

### Placement

- **Question:** New app or a section of the handbook?
- **Decision:** New app in the monorepo with its own deploy and address.
- **Rationale:** Different audience (Vietnamese learners), needs accounts and a database the other apps don't.

### Content authoring

- **Question:** Who writes grammar lessons, meanings and examples?
- **Decision:** AI drafts once during development, owner reviews, the owner publishes approved content to the content database (revised 2026-10-26: was "ships with releases").
- **Rationale:** Fast to produce, quality controlled, no runtime unpredictability.

### Grading written answers

- **Question:** Fixed answers or AI feedback?
- **Decision (revised 2026-10-26):** No AI in the running app. Sentence construction is generated at random from reviewed example sentences (word order, missing word, pick the correct sentence, translate with word tiles) and checked against accepted answers. Free writing is self-checked against model answers.
- **Rationale:** First chosen as AI feedback. The owner dropped it to reduce complexity; it also removed the running cost, rate limits and bot check.
- **Caveats:** No feedback on free-form mistakes. Accepted alternative word orders must be listed in the content.

### Starting level

- **Decision:** Placement test across A1–C1; skippable (start at A1), level editable later.

### Attendance points

- **Decision:** Points + streak + attendance calendar. No leaderboard, no content gating.

### First-visit guidance

- **Question:** How should a first-time learner find out what the app offers?
- **Decision:** A Vietnamese welcome dialog on the first visit to the home screen, offering a step-by-step guided tour of the main areas. Shown once per account, replayable from settings.
- **Rationale:** Owner request (2026-10-26). Showing it on the home screen, after the placement test, means the tour can point at the real areas instead of describing them in the abstract.

## Tentative

### Written assignment types

- **Question:** Which written assignment types besides sentence construction?
- **Tentative Decision:** MVP ships sentence construction (translate / use given words) and one short-writing prompt.
- **Revisit when:** The owner defines the full set of assignment types.
