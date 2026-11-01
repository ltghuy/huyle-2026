---
id: 016
feature: translate-sentence
created: 2026-11-01
---

Paths are relative to `apps/learn-english/` unless they start with `.agents/`, `.claude/` or `.artifacts/`. Line numbers are for the working tree on 2026-11-01, which still has feature 015's uncommitted edits (registry, sentence-exercises, exercise-sets, prepare, lesson-plan, types). Re-check the lines if 015 is changed before 016 starts.

## Documentation Findings

| File | Purpose |
|------|---------|
| `CLAUDE.md` | App overview: no accounts, no AI at runtime, IndexedDB for progress, D1 for content, sync and stats; required skills |
| `README.md` | Learner features, the content pipeline steps (import, ipa, draft, review, audio, publish), the e2e setup, `stats:report` |
| `.claude/rules/learn-english/04-architecture.md` | Layer table (learning is pure TS, storage is the only IndexedDB module, route → service → schema, `getDb()` per request, env via `getEnv`), the free plan limits (10 ms CPU, 50 D1 queries), one D1 call or one `db.batch()` per request, error shape `{ error: { message, issues? } }` in Vietnamese, the Anthropic SDK is script-only |
| `.claude/rules/learn-english/05-event-handlers.md` | Inline JSX handlers only for one short expression; otherwise a named `handleX` |
| `.claude/rules/learn-english/06-writing-content.md` | All learner copy in Vietnamese ("bạn"); approved content is never hand-edited without re-review |
| `.claude/rules/learn-english/02-ui-implementation.md` | shadcn base-nova, no Server Actions, client components never import `src/server/**` |
| `.agents/knowledge.md:461-479` | learn-english gotchas. Most relevant: sentences have no review card (feature 010); approved items can't take a new field, so new data needs its own content kind (feature 008, why `forms:` exists); a new D1 migration must be applied remotely before deploy (007); `sqliteDb()` for service tests (007); a new profile key breaks older tabs mid-sync (012); script tests pin A1 fixture counts, so e2e-only content goes in extra files (013); removing a kind keeps its name in `EXERCISE_KINDS` (015) |
| `.artifacts/features/learn-english/016-translate-sentence/spec.md`, `decisions.md` | The feature: AC-001 to AC-020, edge cases, tentative limits (30 claims per device per day, answer at most 3x the reference length and 500 chars, decided claims kept 90 days, poll at most once a day on open) |

## Entry Points

| File | Line | Purpose |
|------|------|---------|
| `src/learning/types.ts` | 32 | `EXERCISE_KINDS`: the new kind is added here (validated by lessons, attempts, snapshots and the stats API) |
| `src/components/exercise/registry.tsx` | 75 | `entryFor`: pairs each instance kind with its View and grader |
| `src/components/exercise/registry.tsx` | 111 | `itemIdOf`: which item an attempt is recorded against (sentence kinds return `sentenceId`) |
| `src/components/exercise/exercise-runner.tsx` | 122 | `handleCheck`: grades, plays the sound, sets the result, adds to the retry list, then calls `onOutcome` at once |
| `src/lib/session/prepare.ts` | 138 | `prepareStep`: descriptor → runner step; sentence kinds attach `related: sentenceRelated(...)` |
| `src/lib/session/prepare.ts` | 205 | `canPrepareSentenceStep`: cheap eligibility probe used by the library |
| `src/lib/session/record.ts` | 24 | `recordOutcome`: rating, card update, attempt save, stats count, bring related cards forward when wrong |
| `src/learning/lesson-plan.ts` | 69, 298-308, 324 | `SENTENCE_KINDS`, the daily rotation, `supports()` |
| `src/learning/lesson-plan.ts` | 192 | `reviewExercises`: the kinds Ôn tập and the lesson review part use per card |
| `src/lib/session/review.ts` | 22 | `reviewSession`: builds Ôn tập descriptors via `reviewExercises` |
| `src/components/library/exercise-sets.ts` | 20, 25, 140-148 | `SENTENCE_TYPES`, `TYPE_LABELS`, sentence set building |
| `src/app/api/stats/route.ts` | 24 | Pattern for an always-quiet POST (answers 204 whatever happens) |
| `src/app/api/leaderboard/route.ts` | 48 | Pattern for a POST with body cap, Zod parse, rate limiter, service call, `no-store` |
| `src/app/(app)/layout.tsx` | 27-28 | `SyncRunner` and `StatsRunner`: the "while the app is open" hooks; also in `src/app/(focus)/layout.tsx:7` |
| `scripts/review.ts` | 291 | `run`: the owner's `list / sheet / approve / unapprove` commands |
| `scripts/publish-content.ts` | 372 | `main`: approved content → SQL files → `wrangler d1 execute` |
| `scripts/stats-report.ts` | 93-100 | Owner script reading remote D1 through the logged-in wrangler (`d1 execute --remote --json --command`) |
| `scripts/draft-content.ts` | 24, 57, 104-111 | The only Anthropic SDK use: Message Batches, model `claude-opus-5-5`, JSON-schema output |

## Code Flow

### A sentence exercise today (dictation is the closest precedent)

1. **Plan**: `src/learning/lesson-plan.ts:289-308` picks up to `SENTENCE_TASKS` (3, line 30) candidate sentences (new words' examples, then the grammar topic's, then reviewed words'), rotating through `SENTENCE_KINDS` and skipping kinds `supports()` rejects (`lesson-plan.ts:324-330`). Each becomes `{ kind, itemIds: [sentenceId], seed }`.
2. **Prepare**: `src/lib/session/prepare.ts:174-178` builds `buildDictation({ sentence })` with `related: sentenceRelated(index, item)` and a `fallback` word-order step. `sentenceRelated` (`prepare.ts:59-68`) collects the sentence's `word:` ids plus its `grammar:` card and a link to the grammar topic (or the first word).
3. **Render**: `ExerciseRunner` (`src/components/exercise/exercise-runner.tsx:244-253`) renders `entryFor(instance).View` with `{ instance, answer, onAnswer, result, seed, onAudioError }`. `DictationView` (`src/components/exercise/dictation-exercise.tsx:134-178`) keeps the text locally, calls `onAnswer({ text, hinted })` or `null` for blank (line 141), so the check button stays disabled on an empty answer (`exercise-runner.tsx:189,269`).
4. **Grade**: `handleCheck` (`exercise-runner.tsx:122-139`) calls `entry.grade(instance, answer)`. `gradeDictation` (`src/learning/exercises/dictation.ts:192-197`) returns `{ correct, typo?, hinted?, expected: instance.en }`.
5. **Outcome**: the runner immediately calls `onOutcome(step, { itemId: itemIdOf(instance), exercise, result, ms, related: step.related?.cardIds ?? [] })` (`exercise-runner.tsx:132-138`), unless it is a retry round (line 130).
6. **Record**: callers pass it to `recordOutcome` (`src/lib/session/record.ts:24-55`): `rate()` (`src/learning/rating.ts:15-20`) gives `again` when wrong, `hard` when `hinted || typo || ms > 8000`, else `good`. A sentence id is not a card id (`record.ts:9,30`), so only the attempt is saved (`recordAnswer`, `src/storage/attempts.ts:47-63`). `countAttempt` counts the kind (`record.ts:53`). Only when `!result.correct` are related cards brought forward to due now (`record.ts:54,58-61`).
7. **Feedback**: `FeedbackPanel` (`src/components/exercise/feedback-panel.tsx:13-51`) shows "Chưa đúng" + `Đáp án: expected` + the related link when wrong; the View shows `CorrectSentence` (en, vi, play button; `src/components/exercise/sentence-exercises.tsx:22-34`).

### How "hinted → Hard" flows

`GradeResult.hinted` (`src/learning/exercises/types.ts:14`) is set by the grader from the answer (`dictation.ts:196`, from `DictationAnswer.hinted`, `dictation.ts:20-24`, set before checking by `handleHint`, `dictation-exercise.tsx:144-147`) → carried unchanged in `StepOutcome.result` (`exercise-runner.tsx:38`) → `recordOutcome` passes `Boolean(result.hinted)` to `rate` and stores it on the attempt (`record.ts:27,42`) → `rating.ts:18` returns `"hard"`. For a sentence the "hard" rating lands only on the attempt; no card is rescheduled for a correct sentence answer, and nothing is brought forward. So "correct, rated Hard" for a claim = an attempt with `correct: true, hinted: true, rating: "hard"`, no card change, and the stats count it as a correct answer (`record.ts:53`).

### Why a claim after the result needs runner changes

- The result is computed once in `handleCheck` and `onOutcome` fires in the same call, before the learner sees the result (`exercise-runner.tsx:125-138`). The attempt is written with a fresh id generated inside `recordOutcome` (`record.ts:37`), which is not returned, so the caller can't later overwrite it.
- `ExerciseViewProps` (`src/components/exercise/types.ts:4-15`) gives a View `result` read-only; there is no callback to change correctness after grading. `score` (`exercise-runner.tsx:131`), the retry list (`exercise-runner.tsx:128`, library runs use `retryWrong`, `src/components/library/exercise-run.tsx:68`) and the `FeedbackPanel` tone (`feedback-panel.tsx:14`) are all fixed at check time.
- The daily lesson's `onOutcome` also saves the resume position (`src/components/lesson/lesson-player.tsx:60`; extra lessons `src/components/lesson/extra-lesson-player.tsx:76`).
- The only self-judged precedent, writing, judges before the check: the answer carries `correct` and the grader just echoes it (`sentence-exercises.tsx:168-171,243-245`).

### Ôn tập

`ReviewSession` (`src/components/review/review-session.tsx:32-44`) → `reviewQueue` (`src/lib/session/review.ts:14-19`) → `reviewSession` (`review.ts:22-31`) → `reviewExercises` (`lesson-plan.ts:192-215`): `grammar:` cards always get `grammar-gap`, `forms:` cards rotate `FORMS_REVIEW_KINDS`, word cards rotate `WORD_REVIEW_KINDS` (`lesson-plan.ts:67`) by `hashString(itemId) + reps`, with listening dropped when there's no audio. Descriptors are `itemIds: [card.itemId]` (`lesson-plan.ts:199`). Steps are prepared with `prepareSteps` (`prepare.ts:196-198`) and recorded with context `"review"` (`review-session.tsx:18-20`). The same `reviewExercises` builds the daily lesson's review part (`lesson-plan.ts:273,278`).

### Library

`buildSetCards` (`src/components/library/exercise-sets.ts:110-150`) groups `index.lesson.sentences` of the level by topic and, for each `SENTENCE_TYPES` entry, keeps sentences that pass `canPrepareSentenceStep` (`exercise-sets.ts:93-95`, `prepare.ts:205-218`). Set ids are `<type>.<level>.<topic>` (`exercise-sets.ts:42,145`). `buildSetSteps` (`exercise-sets.ts:171-184`) builds up to `SET_SIZE` (10) steps with `prepareStep`. Runs save with context `"exercise"` (`exercise-run.tsx:18-24`) and retry wrong answers.

### Content fetch

`useContentIndex` → `loadIndex` (`src/hooks/use-content-index.ts:24-40`) fetches `grammar`, `forms`, `set` across all levels and `word`, `sentence`, `writing` per level, through `fetchContent` (`src/content/queries.ts:28-30`) → `loadContent` (`src/content/client.ts:124-152`): IndexedDB copy per `kind:level` with its version, refetched when `/api/content/version` changes (`client.ts:63-74`, TTL 5 min line 17). `GET /api/content/items` (`src/app/api/content/items/route.ts:33-68`) validates `kind` against `CONTENT_KINDS` and requires `level` only for `LEVELLED_KINDS` (`src/server/content/content.schema.ts:8-12,21-31`), reads one `db.batch()` (`src/server/content/content.service.ts:45-80`) and edge-caches per `(kind, level, v)`. `buildContentIndex` (`src/lib/session/content-index.ts:33-86`) folds every loaded item into `byId`, set-embedded words and sentences included (lines 41-46).

### Content publish

`content:draft` writes drafts to `content/{kind}/{scope}.json` → `content:review sheet <scope>` writes `content/.review/<scope>.html` (`scripts/review.ts:316-328`) → the owner marks units OK / "Needs fix" + note in the page (marks in localStorage `learn-english-review:<level>`, `scripts/lib/review-sheet.ts:156-159`) and downloads `review-<level>.json` = `{ level, approve: string[], fix: { id, note }[] }` (`review-sheet.ts:27-33,283-293`) → `content:review approve <scope> --ids-file review-<scope>.json` (`review.ts:333-340`, `idsFromDecisions` `review-sheet.ts:69-75`) flips `status` to approved when every reference is approved (`planApprove`, `review.ts:169-195`; `referencesOf`, `review.ts:98-106`) → `content:publish --local|--remote` (`scripts/publish-content.ts:372-457`): `collectApproved` parses every `content/{kind}/*.json` with `sourceItemSchema` and keeps approved items (`publish-content.ts:83-126`), `rowItemsOf` folds set-file words and sentences into their set rows (`publish-content.ts:170-174`), `checkReferences` (`publish-content.ts:176-191`), `planPublish` diffs against `SELECT … FROM content_items` (`publish-content.ts:268-279,427-428`), writes upserts, tombstones and the `content_meta` version bump last (`publish-content.ts:338-341`) to `content/.publish/*.sql` and runs each with `wrangler d1 execute` (`publish-content.ts:362-365,451-455`).

## Architecture

- **Pattern**: Static prerendered shells + client islands; a pure-TS domain core (`src/learning`) with thin adapters for IndexedDB (`src/storage`), content fetching (`src/content`) and a small route → service → schema API over D1 (`src/app/api`, `src/server`). Owner tooling is offline scripts (`scripts/`) that talk to D1 through the logged-in wrangler CLI, not through the app's API.
- **Layers**:
  - Presentation: `src/components/exercise/*` (runner, Views, FeedbackPanel), `src/components/{lesson,review,library}/*`
  - Session glue: `src/lib/session/{prepare,record,review,content-index}.ts`
  - Learning rules (pure): `src/learning/{types,lesson-plan,rating,snapshot,merge,normalize}.ts`, `src/learning/exercises/*`
  - Browser storage: `src/storage/*` (`db.ts`, `broadcast.ts`, per-store repositories, `replace.ts`)
  - Background clients: `src/stats/*`, `src/sync/*`, `src/lib/leaderboard-client.ts`
  - API: `src/app/api/{content,sync,stats,leaderboard}/**/route.ts` → `src/server/{domain}/*.service.ts` + `*.schema.ts` → `src/server/db/{schema,index}.ts`
  - Scripts: `scripts/{draft-content,review,publish-content,stats-report}.ts`, `scripts/lib/*`
- **Key Abstractions**: `ExerciseInstance` + `Entry { exercise, View, grade }` (`registry.tsx:49-70`); `RunnerStep` / `StepOutcome` / `RelatedItems` (`exercise-runner.tsx:26-42`); `ExerciseDescriptor` (`types.ts:81-87`); `ContentIndex` (`content-index.ts:18-29`); `Backend` / `TxOps` over IndexedDB or memory (`src/storage/db.ts:56-77`); `notifyChanged` (`src/storage/broadcast.ts:29-38`); `getDb()` / `getEnv()` per request (`src/server/db/index.ts:9`, `src/server/env.ts:19-26`); `parseBody` / `jsonError` (`src/lib/http.ts:5-30`); `sqliteDb()` for service tests (`src/test-utils/sqlite-d1.ts:31-60`).

## Touched Types -- Member Enumeration

Every entity, projection, contract, or type the feature reads or writes. All exposed members listed -- no sampling. Every "no change needed" claim anchored to `file:line`.

| Type / Entity | Member | file:line | Notes (feature reads? writes? nullable?) |
|---------------|--------|-----------|------------------------------------------|
| `EXERCISE_KINDS` | "mcq" | src/learning/types.ts:33 | unchanged |
| `EXERCISE_KINDS` | "missing-letters" | src/learning/types.ts:34 | unchanged |
| `EXERCISE_KINDS` | "listening" | src/learning/types.ts:35 | unchanged |
| `EXERCISE_KINDS` | "recall" | src/learning/types.ts:36 | unchanged |
| `EXERCISE_KINDS` | "grammar-gap" | src/learning/types.ts:37 | Ôn tập's only grammar kind today |
| `EXERCISE_KINDS` | "word-order" | src/learning/types.ts:38 | sentence kind |
| `EXERCISE_KINDS` | "sentence-gap" | src/learning/types.ts:39 | sentence kind |
| `EXERCISE_KINDS` | "choose-sentence" | src/learning/types.ts:40 | sentence kind |
| `EXERCISE_KINDS` | "tile-translate" | src/learning/types.ts:43 | legacy (015), never planned; its "translate" name is taken by this legacy kind, so the new kind needs a different literal (e.g. "translate") and must not reuse "tile-translate" |
| `EXERCISE_KINDS` | "writing" | src/learning/types.ts:44 | self-marked |
| `EXERCISE_KINDS` | "dictation" | src/learning/types.ts:46 | closest precedent (typed sentence) |
| `EXERCISE_KINDS` | "find-error" | src/learning/types.ts:48 | sentence kind |
| `EXERCISE_KINDS` | "forms-typing" | src/learning/types.ts:50 | unchanged |
| `EXERCISE_KINDS` | "forms-gap" | src/learning/types.ts:51 | unchanged |
| `EXERCISE_KINDS` | "forms-listening" | src/learning/types.ts:52 | unchanged |
| `EXERCISE_KINDS` | "study" | src/learning/types.ts:54 | never an attempt |
| `CardItemId` | `word:` / `grammar:` / `forms:` template | src/learning/types.ts:10 | sentences are not cards; a claim's bring-forward targets these |
| `StoredCard` | itemId | src/learning/types.ts:17 | read by bring-forward |
| `StoredCard` | due | src/learning/types.ts:18 | written to `now` by bring-forward (`record.ts:60`) |
| `StoredCard` | stability | src/learning/types.ts:19 | not touched |
| `StoredCard` | difficulty | src/learning/types.ts:20 | not touched |
| `StoredCard` | elapsed_days | src/learning/types.ts:21 | not touched |
| `StoredCard` | scheduled_days | src/learning/types.ts:22 | not touched |
| `StoredCard` | learning_steps | src/learning/types.ts:23 | not touched |
| `StoredCard` | reps | src/learning/types.ts:24 | drives Ôn tập kind rotation (`lesson-plan.ts:200`) |
| `StoredCard` | lapses | src/learning/types.ts:25 | not touched |
| `StoredCard` | state | src/learning/types.ts:26 | not touched |
| `StoredCard` | last_review | src/learning/types.ts:27 | optional; not touched |
| `StoredCard` | addedAt | src/learning/types.ts:28 | not touched |
| `StoredCard` | updatedAt | src/learning/types.ts:29 | written by bring-forward |
| `AttemptContext` | "lesson" \| "review" \| "exercise" \| "placement" | src/learning/types.ts:58 | translate attempts use the first three |
| `RatingName` | "again" \| "hard" \| "good" | src/learning/types.ts:60 | claim → "hard" |
| `Attempt` | id | src/learning/types.ts:64 | random UUID made in `recordOutcome` (`record.ts:37`), not returned |
| `Attempt` | itemId | src/learning/types.ts:65 | the sentence id for sentence kinds |
| `Attempt` | at | src/learning/types.ts:66 | written |
| `Attempt` | correct | src/learning/types.ts:67 | claim → true |
| `Attempt` | ms | src/learning/types.ts:69 | written |
| `Attempt` | hinted | src/learning/types.ts:70 | claim → true (spec: "the same rating as a hinted answer") |
| `Attempt` | typo | src/learning/types.ts:71 | translate has no typo tolerance (decisions) → false |
| `Attempt` | selfMarked | src/learning/types.ts:73 | true only for "writing" (`record.ts:26`); a claim is a kind of self-mark, but `selfMarked` makes `rate` return "good" (`rating.ts:17`), so it must stay false for "hard" |
| `Attempt` | exercise | src/learning/types.ts:74 | the new kind |
| `Attempt` | context | src/learning/types.ts:75 | written |
| `Attempt` | rating | src/learning/types.ts:76 | written |
| `LessonPartKind` | "review" \| "new-words" \| "grammar" \| "sentences" \| "writing" | src/learning/types.ts:79 | translate goes in "sentences" (lesson) and "review" (lesson review part, if Ôn tập kinds are reused there) |
| `ExerciseDescriptor` | kind | src/learning/types.ts:82 | the new kind |
| `ExerciseDescriptor` | itemIds | src/learning/types.ts:84 | "first one is the target"; `prepareStep` reads only `itemIds[0]` (`prepare.ts:139`) |
| `ExerciseDescriptor` | seed | src/learning/types.ts:86 | unused by a typed exercise except for presentation |
| `LessonPart` | kind | src/learning/types.ts:90 | read |
| `LessonPart` | exercises | src/learning/types.ts:91 | read |
| `DailyLesson` | date | src/learning/types.ts:95 | read |
| `DailyLesson` | contentVersion | src/learning/types.ts:96 | read |
| `DailyLesson` | plan | src/learning/types.ts:97 | holds the new kind; persisted and synced |
| `DailyLesson` | position | src/learning/types.ts:98 | written by `recordOutcome` via `lessonPosition` at check time |
| `DailyLesson` | completedAt | src/learning/types.ts:99 | optional |
| `DailyLesson` | updatedAt | src/learning/types.ts:100 | written |
| `ExtraLesson` | id, date, price, purchasedAt, contentVersion, plan, position, completedAt?, updatedAt | src/learning/types.ts:111-119 | same plan shape as `DailyLesson`; unchanged |
| `Profile` | displayName? | src/learning/types.ts:140 | must never be sent with a claim (AC-009) |
| `Profile` | level | src/learning/types.ts:141 | read (content levels) |
| `Profile` | placement | src/learning/types.ts:142 | unchanged |
| `Profile` | placementResult? | src/learning/types.ts:143 | unchanged |
| `Profile` | tourSeen | src/learning/types.ts:144 | unchanged |
| `Profile` | createdAt | src/learning/types.ts:145 | unchanged |
| `Profile` | timeZone | src/learning/types.ts:146 | read for "once per local day" |
| `Profile` | lastBackupAt? | src/learning/types.ts:147 | unchanged |
| `Profile` | sync? | src/learning/types.ts:148 | sync code; must never be sent with a claim (AC-009) |
| `Profile` | statsOptOut | src/learning/types.ts:149 | stats opt-out; claims are not stats, decide whether it applies |
| `Profile` | leaderboard? | src/learning/types.ts:155 | holds a secret token; not to be sent with claims |
| `Profile` | vocabSet? | src/learning/types.ts:157 | unchanged |
| `Profile` | deviceId | src/learning/types.ts:159 | random per browser, "only ever sent hashed with the day"; the daily claim limit could reuse the stats hashing (`stats.service.ts:35-38`) |
| `Profile` | schemaVersion | src/learning/types.ts:160 | unchanged |
| `Profile` | fieldUpdatedAt | src/learning/types.ts:162 | a new profile key breaks older tabs mid-sync (knowledge 012), so pending claims are better outside `Profile` |
| `GradeResult` | correct | src/learning/exercises/types.ts:10 | read |
| `GradeResult` | typo? | src/learning/exercises/types.ts:12 | not set by translate |
| `GradeResult` | hinted? | src/learning/exercises/types.ts:14 | the claim's Hard rating rides here |
| `GradeResult` | expected | src/learning/exercises/types.ts:16 | shown as "Đáp án:" (`feedback-panel.tsx:39`); e2e `playThrough` reads it to retry (`e2e/helpers.ts:55-57`) |
| `GradeResult` | explanationVi? | src/learning/exercises/types.ts:18 | optional |
| `ExerciseViewProps` | instance | src/components/exercise/types.ts:5 | read |
| `ExerciseViewProps` | answer | src/components/exercise/types.ts:7 | null until checkable |
| `ExerciseViewProps` | onAnswer | src/components/exercise/types.ts:8 | View → runner |
| `ExerciseViewProps` | result | src/components/exercise/types.ts:10 | read-only; no override callback exists |
| `ExerciseViewProps` | seed | src/components/exercise/types.ts:12 | presentation only |
| `ExerciseViewProps` | onAudioError? | src/components/exercise/types.ts:14 | not needed (audio only after the result) |
| `Entry` (registry) | exercise | src/components/exercise/registry.tsx:67 | new entry |
| `Entry` (registry) | View | src/components/exercise/registry.tsx:68 | new View |
| `Entry` (registry) | grade | src/components/exercise/registry.tsx:69 | new grader |
| `ExerciseInstance` | McqInstance … FormsListeningInstance (15 members) | src/components/exercise/registry.tsx:49-64 | add the translate instance |
| `RelatedItems` | cardIds | src/components/exercise/exercise-runner.tsx:27 | from `sentenceRelated`; reused to bring cards forward after a rejected claim |
| `RelatedItems` | link? | src/components/exercise/exercise-runner.tsx:28 | grammar link for AC-003 |
| `RunnerStep` (exercise) | key, type, instance, seed, fallback?, related? | src/components/exercise/exercise-runner.tsx:32 | translate needs no fallback |
| `RunnerStep` (study) | key, type, item, examples | src/components/exercise/exercise-runner.tsx:33 | unchanged |
| `StepOutcome` | itemId | src/components/exercise/exercise-runner.tsx:36 | read |
| `StepOutcome` | exercise | src/components/exercise/exercise-runner.tsx:37 | read |
| `StepOutcome` | result | src/components/exercise/exercise-runner.tsx:38 | `GradeResult` |
| `StepOutcome` | ms | src/components/exercise/exercise-runner.tsx:39 | read |
| `StepOutcome` | related | src/components/exercise/exercise-runner.tsx:41 | read |
| `RunnerScore` | correct, total, corrected? | src/components/exercise/exercise-runner.tsx:45-49 | fixed at check time today |
| `ExerciseRunnerProps` | steps, retryWrong?, startAt?, onOutcome, onAdvance?, onFinish, onExit, exitDescription? | src/components/exercise/exercise-runner.tsx:53-69 | no "outcome changed" callback |
| `DictationInstance` | kind, sentenceId, audio, en, vi, wordCount | src/learning/exercises/dictation.ts:10-18 | template for a translate instance (minus audio-first) |
| `DictationAnswer` | text, hinted | src/learning/exercises/dictation.ts:20-24 | template for a translate answer |
| `ContentKind` / `CONTENT_KINDS` | "word", "grammar", "sentence", "writing", "placement", "forms", "set" | src/content/schema.ts:10 | an accepted-wordings kind would be added here |
| sentence body | en | src/content/schema.ts:60 | the reference answer |
| sentence body | vi | src/content/schema.ts:61 | the prompt |
| sentence body | audio | src/content/schema.ts:62 | for the result's play button; may be "" (fixtures) |
| sentence body | tokens | src/content/schema.ts:63 | ≥ 2 |
| sentence body | acceptedOrders | src/content/schema.ts:65 | other accepted orders = `acceptedText(body, order)` (`src/learning/exercises/tiles.ts:39-41`) |
| sentence body | wrongVariants | src/content/schema.ts:67 | not used |
| sentence body | gapCandidates | src/content/schema.ts:69 | not used |
| sentence body | wordIds | src/content/schema.ts:70 | related word cards |
| sentence body | grammarSlug? | src/content/schema.ts:71 | related grammar card + link |
| content item base | level, topic?, sort | src/content/schema.ts:127 | library groups by `topicOf`; set sentences keep a real level (knowledge 012) |
| source item | status ("draft" \| "approved"), reviewNotes? | src/content/schema.ts:163-168 | approval gate for any new kind |
| `forms` body (precedent for a per-item add-on kind) | wordId, past, participle, noteVi?, audio, practice | src/content/schema.ts:112-125 | id `forms:<word slug>` mirrors its word |
| `contentItems` (D1) | id | src/server/db/schema.ts:10 | PK |
| `contentItems` (D1) | kind | src/server/db/schema.ts:11 | Drizzle enum is TS-only: the SQL column has no CHECK (`migrations/0000_init.sql`), so a new kind needs the TS enum updated but no migration |
| `contentItems` (D1) | level | src/server/db/schema.ts:12 | NOT NULL |
| `contentItems` (D1) | topic | src/server/db/schema.ts:13 | nullable |
| `contentItems` (D1) | sort | src/server/db/schema.ts:14 | default 0 |
| `contentItems` (D1) | body | src/server/db/schema.ts:15 | JSON text |
| `contentItems` (D1) | deleted | src/server/db/schema.ts:16 | tombstone |
| `contentItems` (D1) | updatedVersion | src/server/db/schema.ts:17 | publish version |
| `contentMeta` (D1) | id, version, publishedAt, counts | src/server/db/schema.ts:23-28 | `counts` built from `CONTENT_KINDS` (`publish-content.ts:325-329`) |
| `syncProfiles` (D1) | codeHash, data, rev, size, createdAt, updatedAt | src/server/db/schema.ts:32-39 | unchanged; pending claims ride inside `data` if added to the snapshot |
| `statsDaily` (D1) | day, metric, key, count | src/server/db/schema.ts:42-51 | unchanged |
| `statsDevices` (D1) | day, deviceHash | src/server/db/schema.ts:55-62 | pattern for a per-device-per-day key that can't be followed across days |
| `leaderboardEntries` (D1) | id, tokenHash, name, streak, earned, lastDate, reachedAt, updatedAt | src/server/db/schema.ts:70-83 | pattern for in-request 90-day cleanup (`leaderboard.service.ts:36-41`) |
| `Env` | STATS_SALT | src/server/env.ts:8 | min 32 chars; reusable salt for a device hash |
| `Env` | SYNC_MAX_BYTES | src/server/env.ts:10 | unchanged |
| `CloudflareEnv` bindings | DB, SYNC_LOOKUP_LIMITER, LEADERBOARD_LIMITER, STATS_SALT | cloudflare-env.d.ts:6-9, wrangler.jsonc | a claim limiter would be a third `ratelimits` entry (namespace ids 1001, 1002 used) |
| `ApiError` | error.message, error.issues? | src/lib/http.ts:3 | response error shape |
| `COUNTED_EXERCISE_KINDS` | `EXERCISE_KINDS` minus "study" | src/server/stats/stats.schema.ts:8-10 | derived: the new kind is counted with no edit |
| `statsPayloadSchema` | day, deviceId, lessonsCompleted, placementDone, exercises, wrongWords | src/server/stats/stats.schema.ts:31-40 | `exercises` is a partial record over counted kinds; an older server rejects an unknown kind (whole beacon dropped) until deployed |
| `StatsToday` / `DayCounts` | day, total, sent / lessonsCompleted, placementDone, exercises, wrongWords | src/stats/stats-store.ts:10-21 | kept in `meta` under `"stats-today"` (line 8): precedent for a small outbox in `meta` |
| `StoreValues` (IndexedDB) | cards, attempts, lessons, extraLessons, attendance, meta, content | src/storage/db.ts:23-31 | a new store needs a `STORES` entry with `since: 3` and `DB_VERSION = 3` |
| `STORES` config | keyPath / indexes / since per store | src/storage/db.ts:39-48 | upgrade creates stores newer than `oldVersion` (lines 93-99) |
| `DB_VERSION` | 2 | src/storage/db.ts:5 | current IndexedDB version |
| `MetaRecord` | key, value | src/storage/db.ts:8-11 | generic key-value |
| `ContentCacheEntry` | key, version, items, tombstones, fetchedAt | src/storage/db.ts:14-21 | offline cache per `kind:level` |
| `ChangedMessage` | type, stores, tab? | src/storage/broadcast.ts:5-10 | new writes must call `notifyChanged` (knowledge 005) |
| `LearnerState` | profile, cards, attendance, lessons, extraLessons, attempts | src/learning/snapshot.ts:32-39 | what `replaceAll` writes; pending claims would join here to survive restore/sync |
| `SnapshotData` | meta, cards, attendance, lessons, extraLessons, attempts | src/learning/snapshot.ts:48-55 | add pending claims here to carry them (edge case "restores progress on another device") |
| `Snapshot` | app, version, exportedAt, summary, data | src/learning/snapshot.ts:57-63 | `version` literal 3 |
| `SNAPSHOT_VERSION` | 3 | src/learning/snapshot.ts:24 | bumped for new data shapes (008 → 2, 013 → 3); not bumped for new exercise kinds (010, 011) |
| `MIGRATIONS` | 1 → 2 identity, 2 → 3 adds `extraLessons: []` | src/learning/snapshot.ts:266-274 | a 3 → 4 step would add an empty claims list |
| `ContentIndex` | byId | src/lib/session/content-index.ts:19 | includes set-embedded sentences |
| `ContentIndex` | wordsByLevel | src/lib/session/content-index.ts:20 | read |
| `ContentIndex` | grammarByLevel | src/lib/session/content-index.ts:21 | read |
| `ContentIndex` | forms | src/lib/session/content-index.ts:23 | unchanged |
| `ContentIndex` | sets | src/lib/session/content-index.ts:25 | unchanged |
| `ContentIndex` | setsByWord | src/lib/session/content-index.ts:27 | unchanged |
| `ContentIndex` | lesson | src/lib/session/content-index.ts:28 | `LessonContent` |
| `LessonContent` | wordsByLevel, grammarByLevel, sentences, writing, skip, setWords?, setSentences? | src/learning/lesson-plan.ts:72-85 | planner input; `skip` holds tombstones (edge case "sentence removed") |
| `ExerciseSet` | id, type, group, level, scope, itemIds | src/components/library/exercise-sets.ts:41-50 | `type` is a `SetType` |
| `SetCard` | key, group, scope, title, titleEn?, count, sets | src/components/library/exercise-sets.ts:52-61 | unchanged |
| `ContentItemsQuery` | kind, level?, v | src/server/content/content.schema.ts:21-32 | a new kind not in `LEVELLED_KINDS` is fetched across all levels |
| `ContentItemsResponse` | version, items, tombstones | src/server/content/content.schema.ts:50-56 | unchanged |
| `Decisions` (review sheet) | level, approve, fix: { id, note }[] | scripts/lib/review-sheet.ts:27-33 | `fix.note` is the precedent for "a short note per item"; a reject explanation would need its own field or file |
| `ReviewUnit` | id, kind ("word" \| "grammar" \| "writing" \| "forms"), ids, hash, flagged, topic, item, sentences, headword? | scripts/lib/review-sheet.ts:11-25 | `reviewUnits` skips any other kind (line 42), so a new kind needs a unit kind and a renderer |
| `ExistingRow` (publish) | id, kind, level, topic, sort, body, deleted | scripts/publish-content.ts:47-55 | unchanged |

### Absence Claims

Claims that an existing type already covers the feature's needs -- each must cite the member that backs the claim.

| Claim | Anchor (file:line) |
|-------|--------------------|
| A hinted correct answer is already rated Hard, no new rating logic needed | src/learning/rating.ts:18; src/lib/session/record.ts:27 |
| A correct sentence answer never moves a card, so a claim's Hard rating changes only the attempt | src/lib/session/record.ts:9,30-33 |
| Bringing related cards forward already exists, but is private to `record.ts` and runs only for a wrong outcome; a rejected-claim notice needs it exported or reused | src/lib/session/record.ts:54,58-61 |
| `sentenceRelated` already yields the cards and grammar link a translate step needs (AC-003, AC-016), but it is module-private | src/lib/session/prepare.ts:59-68 |
| The stats counted kinds derive from `EXERCISE_KINDS`, so the stats client and API need no list edit | src/server/stats/stats.schema.ts:8-10; src/stats/stats-client.ts:26,101 |
| Snapshots, saved lessons and attempts validate kinds against `EXERCISE_KINDS`, so adding the kind there covers them | src/learning/snapshot.ts:112,122 |
| Normalization for case, curly apostrophes and spaces already exists | src/learning/normalize.ts:4,21-25 |
| Contraction ↔ full form equivalence already exists, but only inside dictation's word aligner (`expansions` is exported; `keyOf`, `compareDictation` internals are not reusable as a whole-sentence matcher) | src/learning/exercises/dictation.ts:85-95,135-189 |
| Dictation's typo tolerance must not carry over (decisions: no typo tolerance) | src/learning/exercises/dictation.ts:161-163,195 |
| A typed English input with Telex/VNI warning already exists | src/components/exercise/english-input.tsx:14-35 |
| The result card with English, Vietnamese and a play button already exists (AC-003) | src/components/exercise/sentence-exercises.tsx:22-34 |
| The wrong-answer panel already shows "Đáp án" and the related grammar link (AC-003) | src/components/exercise/feedback-panel.tsx:37-47 |
| No runner hook lets a View change the outcome after grading; `onOutcome` fires at check time | src/components/exercise/types.ts:4-15; src/components/exercise/exercise-runner.tsx:122-138 |
| No owner-only API auth exists: no route reads an `Authorization` header or an admin secret; the only secrets are `STATS_SALT`, the sync code header and leaderboard entry tokens. Owner scripts reach D1 with the logged-in wrangler instead | src/server/env.ts:6-11; src/app/api/sync/route.ts:19-41; src/server/leaderboard/secret.ts:5-8; scripts/stats-report.ts:93-100; scripts/publish-content.ts:362-369 |
| No scheduled/cron handler exists: wrangler config has no `triggers`, and OpenNext config only sets the cache. Retention runs inside requests (leaderboard deletes up to 50 stale rows per write) | wrangler.jsonc (no `triggers` key); open-next.config.ts:8-11; src/server/leaderboard/leaderboard.service.ts:17-19,36-41,98-99 |
| No outbox/retry queue for POSTs exists; stats drop failures and sync retries by its own backoff | src/stats/stats-client.ts:57-68; src/sync/sync-client.ts:354-361 |
| No "once per day on open" runner exists beyond `flushIfNewDay`, which runs on mount and on each visible event | src/components/stats/stats-runner.tsx:6-17; src/stats/stats-client.ts:125-138 |
| No one-time notice component exists for "on app open"; toasts (sonner, `Toaster` at top-center) and the controlled `NamePrompt` dialog are the patterns | src/app/layout.tsx:58; src/components/name/name-prompt.tsx:13-28 |
| `ContentIndex` has no field for accepted wordings; the content kinds have no alternative-wording data | src/lib/session/content-index.ts:18-29; src/content/schema.ts:58-85 |
| `content:draft import` never touches approved items, so approved wordings can't be appended to approved sentences; a new kind with its own status is the established route | scripts/lib/drafting.ts:383-390; .agents/knowledge.md (feature 008 entry) |
| `forms` is the precedent for a per-item add-on kind: id mirrors the parent, own review status, references checked at review and publish | src/content/schema.ts:107-125; scripts/review.ts:98-106; scripts/publish-content.ts:188 |
| Set-scoped sentences (in `content/sentence/set-*.json`) are not rows: they are embedded in set rows, so a new kind that references sentence ids must accept those as valid references | scripts/publish-content.ts:14-18,96-97,170-174; src/lib/session/content-index.ts:41-46 |
| `content_items.kind` has no SQL CHECK, so a new content kind needs no D1 migration (only the Drizzle TS enum) | migrations/0000_init.sql:1-10; src/server/db/schema.ts:11 |
| `replaceAll` clears the whole `meta` store on restore and every sync merge, so anything kept only under a `meta` key (as stats do) is wiped then | src/storage/replace.ts:13,32-43; src/sync/sync-client.ts:158-165 |
| The library only builds sentence sets from level sentences, not set-scoped ones (same as other sentence types) | src/components/library/exercise-sets.ts:140 |
| An Ôn tập descriptor's target is the card id; `recordOutcome` reschedules `itemIdOf(instance)`, which is the sentence id for sentence kinds, so a translate step in Ôn tập would not reschedule the reviewed word/grammar card without a change | src/learning/lesson-plan.ts:199; src/components/exercise/registry.tsx:115-120; src/lib/session/record.ts:30-33 |

## Conventions

| Aspect | Project Uses | Avoid | Reference |
|--------|-------------|-------|-----------|
| Env vars | `getEnv()` Zod-parsed per request from `getCloudflareContext().env`; secrets via `wrangler secret put` and `.dev.vars` | `process.env`, `.env*` files (OpenNext inlines them) | src/server/env.ts:6-26; .env.example |
| D1 access | `getDb()` per request; one call or one `db.batch()` per request | module-scope clients, interactive transactions | src/server/db/index.ts:9; src/server/stats/stats.service.ts:61 |
| Route shape | parse → call service → respond; Vietnamese messages in a `*_MESSAGES` const; `Cache-Control: no-store` for writes; body size cap before reading | logic in routes | src/app/api/leaderboard/route.ts:16-46; src/server/leaderboard/leaderboard.schema.ts:9-16 |
| Silent endpoints | always 204, nothing from the request logged | surfacing errors to the learner | src/app/api/stats/route.ts:6-32 |
| Input validation | Zod schemas in `src/server/{domain}/*.schema.ts` (no `server-only`, shared with the client); `parseBody` or a local `readBody` | unvalidated JSON | src/lib/http.ts:12-30; src/server/stats/stats.schema.ts:31-40 |
| Error shape | `{ error: { message, issues? } }`, message in Vietnamese | English messages | src/lib/http.ts:3-10 |
| Services | `import "server-only"` first line | client imports of `src/server/**` | src/server/stats/stats.service.ts:1 |
| Rate limiting | Workers rate-limit binding per IP, IP never stored; missing binding → not throttled | storing IPs | src/server/leaderboard/secret.ts:16-27; wrangler.jsonc `ratelimits` |
| Device counting | SHA-256 of deviceId + day + `STATS_SALT`, so devices can't be followed across days | storing raw deviceId | src/server/stats/stats.service.ts:34-38 |
| Retention | bounded cleanup inside a request (`DELETE … WHERE id IN (SELECT … LIMIT 50)`) | cron | src/server/leaderboard/leaderboard.service.ts:36-41 |
| Migrations | edit `src/server/db/schema.ts`, `drizzle-kit generate` into `migrations/NNNN_name.sql`, apply with `wrangler d1 migrations apply learn-english --local/--remote` (remote before deploy) | hand-written SQL without a snapshot | drizzle.config.ts; migrations/meta/_journal.json; .agents/knowledge.md (007, 013 entries) |
| Browser storage | only `src/storage/**` touches IndexedDB; every write calls `notifyChanged`; atomic check-and-write = `get` then `put` in one transaction | `add()` for locks; writes without `notifyChanged` | src/storage/broadcast.ts:29-38; src/storage/extra-lessons.ts:33-47 |
| Background senders | fire-and-forget, swallow errors, never block learning | awaiting network in the answer path | src/stats/stats-client.ts:56-68,82-97 |
| Pure learning code | `src/learning/**` has no React, IndexedDB or fetch | side effects in generators | .claude/rules/learn-english/04-architecture.md |
| Exercise modules | `buildX(input, seed?)` returns an instance or null; `gradeX(instance, answer): GradeResult`; `canX(sentence)` eligibility | building to probe eligibility | src/learning/exercises/dictation.ts:48-63,192-197 |
| Naming | camelCase functions, SCREAMING_SNAKE consts, `handleX` handlers, `onX` props, kebab-case files | inline multi-line JSX handlers | .claude/rules/learn-english/05-event-handlers.md |
| UI copy | Vietnamese with diacritics, "bạn"; English only for taught text with `lang="en"` | English UI strings | .claude/rules/learn-english/06-writing-content.md; src/components/exercise/feedback-panel.tsx:25 |
| Owner scripts | `tsx scripts/*.ts`, usage at the top of the file, `parseArgs`, pure exported helpers + an I/O section, `if (process.argv[1]?.endsWith("x.ts")) main()` | shipping script code in the app bundle | scripts/stats-report.ts:1-12,91-127 |
| Anthropic usage (scripts only) | `new Anthropic()` (key from `ANTHROPIC_API_KEY` or `ant auth login`), `MODEL = "claude-opus-5-5"`, cached system prompt, `output_config: { effort, format: { type: "json_schema", schema } }`, Message Batches for bulk; a free `import` path for drafts written elsewhere | the SDK in `src/` | scripts/draft-content.ts:13-14,57-61,102-111,160; scripts/lib/prompts.ts:1-3 |
| Content files | `content/{kind}/{scope}.json`, 2-space JSON sorted by id, trailing newline; hidden working dirs `content/.drafts`, `.review`, `.publish` | hand-editing approved items | scripts/review.ts:14-17; scripts/draft-content.ts:77,89 |

## Test Infrastructure

- **Framework**: Vitest (happy-dom, globals, `@testing-library/react`, `fake-indexeddb`); Playwright for e2e
- **Location**: unit tests next to the code (`src/**/*.test.{ts,tsx}`, `scripts/**/*.test.ts`, `vitest.config.mts:11`); e2e in `e2e/specs/*.spec.ts` (phones: `*.mobile.spec.ts`)
- **Command**: `pnpm test` (unit), `pnpm e2e` (seeds `.wrangler/e2e` with migrations + `scripts/fixtures/content`, builds for Cloudflare, previews on port 3102; `package.json` `e2e:seed`, `playwright.config.ts:8,32-37`)
- **Patterns**:
  - Route tests mock the service, `getDb` and `getEnv` with `vi.mock` then `await import("./route")` and call `POST(new Request(...))` (`src/app/api/stats/route.test.ts:1-9,21`).
  - Service tests either record statements with a fake D1 under real drizzle (`src/server/stats/stats.service.test.ts:14-33`) or run real SQL with `sqliteDb()` (`src/test-utils/sqlite-d1.ts:31-60`, needs `// @vitest-environment node`, migrations applied automatically).
  - Exercise generator tests use fixtures `word()`, `sentence()`, `grammar()`, `forms()`, `vocabSet()` (`src/learning/exercises/fixtures.ts:9,34,53,74,101`); a sentence named after its slug contains digits, which dictation rejects (knowledge 010).
  - Runner tests render `ExerciseRunner` with steps and spy `onOutcome` / `onFinish`, `playAnswerSound` mocked (`src/components/exercise/exercise-runner.test.tsx:14-26`); per-feature `describe` blocks (dictation `:369`, find-error `:464`).
  - Session tests: `prepareStep` / `recordOutcome` against real IndexedDB via `resetStorage`, `makeCard` (`src/lib/session/session.test.ts:1-26`; `src/storage/test-utils.ts:6,11,29`).
  - Planner tests in `src/learning/lesson-plan.test.ts`; library tests in `src/components/library/exercise-library.test.tsx`; snapshot migration tests in `src/learning/snapshot.test.ts:105,170,198`.
  - Script tests pin A1 fixture counts (`scripts/publish-content.test.ts`, `scripts/review.test.ts`); e2e-only content goes in extra files such as `scripts/fixtures/content/sentence/A1-verbs.json`. Fixture sentences have `audio: ""` (`scripts/fixtures/content/sentence/A1.json`), and the seed publishes with `--allow-missing-audio`.
  - e2e `playThrough` answers any exercise by typing "test" into the first textbox, learns the right answer from `Đáp án:` `span[lang="en"]`, and retries with it (`e2e/helpers.ts:36-90`); a new typed exercise works with it as long as `expected` is the accepted wording.

## Essential Files

### Reference Files (patterns to follow)

1. `src/learning/exercises/dictation.ts` - typed sentence generator/grader, contraction expansions, `canDictate` eligibility
2. `src/components/exercise/dictation-exercise.tsx` - typed sentence View using `EnglishInput` and `CorrectSentence`
3. `src/components/exercise/sentence-exercises.tsx` - `CorrectSentence`, `WritingView` (self-judgement before check)
4. `src/app/api/leaderboard/route.ts` + `src/server/leaderboard/leaderboard.schema.ts` + `leaderboard.service.ts` + `secret.ts` - POST with body cap, Zod, rate limiter, single `db.batch()`, in-request cleanup
5. `src/app/api/stats/route.ts` + `src/server/stats/stats.{schema,service}.ts` - silent 204 endpoint, daily device hash
6. `src/stats/stats-client.ts` + `src/stats/stats-store.ts` + `src/components/stats/stats-runner.tsx` - background sender, `meta`-key store, run-on-open
7. `src/storage/extra-lessons.ts` + `src/storage/db.ts` (013 added a store with `since: 2`) - adding an IndexedDB store
8. `src/learning/snapshot.ts` + `src/learning/merge.ts` + `src/storage/replace.ts` (013 added `extraLessons`) - carrying a new list in backups and sync
9. `src/content/schema.ts` `formsBodySchema` + `scripts/review.ts` + `scripts/lib/review-sheet.ts` + `scripts/publish-content.ts` (008) - adding a content kind through review and publish
10. `scripts/stats-report.ts` - owner script reading remote D1 via wrangler
11. `scripts/draft-content.ts` + `scripts/lib/prompts.ts` - Anthropic calls from scripts

### Files to Modify

1. `src/learning/types.ts` - add the kind to `EXERCISE_KINDS` (`:32-55`)
2. `src/learning/exercises/<new>.ts` (+ test) - build, eligibility, grade against `en`, accepted orders and approved wordings
3. `src/components/exercise/<new>-exercise.tsx` - View: instruction, `vi`, `EnglishInput`, result card, claim action
4. `src/components/exercise/registry.tsx` - `ExerciseInstance` union (`:49-64`), `entryFor` (`:75-108`), `itemIdOf` (`:111-126`)
5. `src/components/exercise/exercise-runner.tsx` (+ test) - a way to turn a checked wrong answer into "correct, hinted" before moving on (score, retry list, outcome timing; `:122-157`)
6. `src/components/exercise/feedback-panel.tsx` - tone/text after a claim (`:13-51`)
7. `src/lib/session/prepare.ts` - `prepareStep` case (`:143-193`), `canPrepareSentenceStep` (`:205-218`); pass accepted wordings from the index
8. `src/lib/session/record.ts` - outcome for a claim; export or reuse `bringForward` for rejected claims (`:24-61`)
9. `src/lib/session/content-index.ts` + `src/hooks/use-content-index.ts` - load and index accepted wordings (`content-index.ts:18-29`, `use-content-index.ts:25-32`)
10. `src/learning/lesson-plan.ts` - `STEP_SECONDS` (`:40-59`), `SENTENCE_RESERVE_SECONDS` if slower than 35 (`:63`), `SENTENCE_KINDS` (`:69`), `supports()` (`:324-330`), and Ôn tập kinds in `reviewExercises` (`:192-215`)
11. `src/lib/session/review.ts` - give `reviewExercises` the example sentences it needs (`:22-31`)
12. `src/components/library/exercise-sets.ts` - `SENTENCE_TYPES` (`:20`), `TYPE_LABELS` (`:25-36`)
13. `src/content/schema.ts` - new content kind for approved wordings (`:10`, `:150-158`); `src/server/db/schema.ts:11` enum; `src/server/content/content.schema.ts:8` if levelled
14. `src/storage/db.ts` (+ new repository) - claim outbox / pending refs store (`DB_VERSION` `:5`, `StoreValues` `:23-31`, `STORES` `:39-48`), or a `LearnerState` list
15. `src/learning/snapshot.ts`, `src/learning/merge.ts`, `src/storage/replace.ts`, `src/components/settings/backup-actions.ts` - carry pending claims (`SNAPSHOT_VERSION` `:24`, `MIGRATIONS` `:266-274`, schema `:177-190`)
16. `src/app/api/<claims>/route.ts` (+ test), `src/server/<claims>/<claims>.{schema,service}.ts` (+ tests), `src/server/db/schema.ts`, `migrations/0004_*.sql`, `wrangler.jsonc` (limiter), `cloudflare-env.d.ts` (`pnpm cf:typegen`)
17. A client sender and an on-open poller (new `src/<claims>/*` module + a runner in `src/app/(app)/layout.tsx:27-28` and `src/app/(focus)/layout.tsx:7`) and a one-time notice component
18. New owner script(s) under `scripts/` (+ tests): fetch claims from D1 via wrangler, pre-judge with Claude, write a review sheet, apply decisions (approved → new content kind file; rejected → D1 decision + Vietnamese explanation)
19. `scripts/review.ts` / `scripts/lib/review-sheet.ts` / `scripts/publish-content.ts` - accept the new kind (`referencesOf` `:98-106`, `reviewUnits` `:36-66`, `checkReferences` `:176-191`, set-scoped sentence references)
20. `scripts/fixtures/content/<newkind>/A1-*.json` - e2e fixture for an approved wording (not `A1.json`, pinned by script tests)
21. `e2e/specs/<new>.spec.ts` - answer, claim, accepted-after-publish flow
22. `.agents/knowledge.md` - rollout notes (migration before deploy, older tabs vs new kind/snapshot version)

### Dependencies

1. `src/learning/normalize.ts` - `normalize` (`:21-25`), `tokenize` (`:43-47`), `hasNonAscii` (`:50-53`)
2. `src/learning/exercises/dictation.ts` - `expansions` (`:85-95`) for contraction forms
3. `src/learning/exercises/tiles.ts` - `acceptedText` (`:39-41`) for the other accepted orders
4. `src/components/exercise/english-input.tsx`, `sentence-exercises.tsx` `CorrectSentence`, `audio-button.tsx`
5. `src/learning/rating.ts` - `rate` (`:15-20`)
6. `src/storage/attempts.ts` - `recordAnswer` (`:47-63`); `src/storage/cards.ts` - `getCard`, `putCards` (`:5,18`)
7. `src/storage/broadcast.ts` - `notifyChanged`, `subscribeChanges`
8. `src/learning/attendance.ts` - `localDate` (`:10`) for "once per local day"
9. `src/lib/http.ts` - `parseBody`, `jsonError`, `ApiError`
10. `src/server/db/index.ts` - `getDb`; `src/server/env.ts` - `getEnv` (`STATS_SALT`)
11. `src/server/stats/stats.service.ts` - `hashDevice` (`:35-38`) pattern for the per-day device key
12. `@opennextjs/cloudflare` `getCloudflareContext` for rate-limit bindings (`src/server/leaderboard/secret.ts:2,19`)
13. `sonner` `toast` / `src/components/ui/dialog.tsx` for the notice
14. `@anthropic-ai/sdk` (devDependency, scripts only, `package.json`)
15. `src/test-utils/sqlite-d1.ts`, `src/learning/exercises/fixtures.ts`, `src/storage/test-utils.ts`, `e2e/helpers.ts`
