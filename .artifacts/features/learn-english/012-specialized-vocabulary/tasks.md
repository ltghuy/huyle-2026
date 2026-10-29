---
id: 012
feature: specialized-vocabulary
created: 2026-10-29
---

# Tasks: Specialized vocabulary sets

## Summary

Total: 15 | Completed: 15 | Remaining: 0

## Execution Plan

```
T001 --> T002 --> T003 --┬--> T004 --> T005 --┐
                         ├--> T006 -----------┤
                         └--> T007 --> T008 --┼--> T009 --> T010 --> T011
T012 --> T013 --> T014 -----------------------┘                       │
                                                         T015 <-------┘
```

T001–T003 are the data layer; T004–T008 the app; T012–T014 the scripts and
fixture (independent of the app after T001); T009–T011 wire the UI and e2e;
T015 drafts the real content and waits on owner review before publishing.

## Quality Gates

Run after each task or batch (in `apps/learn-english`):

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build` (after UI groups)

## Tasks

### Set content model

- [x] T001 [P] Add the `set` kind (`setBodySchema`, union member), `source: "specialized"` for words, and `"set"` in the Drizzle `kind` enum
  - **Done when:** schema tests cover a valid set, a bad id, empty `wordIds`, duplicate `wordIds`, a specialized word; typecheck passes -- VERIFIED

- [x] T002 [B:T001] Expand set bundles in `buildContentIndex` (`byId`, `sets`, `setsByWord`, `lesson.setWords`, `lesson.setSentences`) and fetch `set` in `loadIndex`
  - **Done when:** tests show embedded items in `byId` but not `wordsByLevel`, a level item wins over its embedded copy, a word in two sets maps to both, a tombstoned set is dropped -- VERIFIED

- [x] T003 [B:T002] Add pure set helpers in `src/learning/sets.ts` (`setLabel`, `setProgress`, `nextSetWords`, `isSetFinished`)
  - **Done when:** unit tests cover labels for course vs specialized words, progress with shared words, finished and missing sets -- VERIFIED

### Followed set in the profile

- [x] T004 [B:T003] Add `profile.vocabSet` to the type, `PROFILE_KEYS` and `metaSchema`
  - **Done when:** snapshot round trip keeps it; a snapshot without it still parses; merge tests show follow and unfollow winning by stamp -- VERIFIED

- [x] T005 [B:T004] Take new words from the followed set in the planner, top up from level words, and add `replanTodayIfUnstarted`
  - **Done when:** planner tests: set words first in `wordIds` order, learned words skipped, short set topped up, missing set falls back, plan stays deterministic; today test: an unstarted lesson is rebuilt, a started one is kept -- VERIFIED

### Exercises

- [x] T006 [B:T003] Draw distractors for specialized words and their sentences from the same set
  - **Done when:** prepare tests show a specialized word's MCQ options come from its set, and level words still use their level -- VERIFIED

### Vocabulary search and labels

- [x] T007 [B:T003] Add specialized words to `useAllWords` and show the set name instead of a level in search suggestions and the word dialog
  - **Done when:** component tests find a specialized word by headword and show its set title -- VERIFIED

- [x] T008 [B:T007] Move `WordList`/`WordCard` to `word-list.tsx` and label specialized words with `setLabel`
  - **Done when:** existing vocabulary browser tests pass unchanged -- VERIFIED

### Scripts and publish

- [x] T012 [B:T001] Widen the content scripts from level to scope (`A1`…`C1` or `set-<slug>`): review CLI and sheet, audio generation, draft import; add `checkSpecializedDraft` (rejects a headword + part of speech already in the course)
  - **Done when:** script tests run review/approve and audio job listing on a set scope; drafting test rejects a duplicate of a course word (AC-016) -- VERIFIED

- [x] T013 [B:T012] Build set bundles in `content:publish`: skip set-scope items as rows, embed words and examples, publish a set only when it and everything it needs is approved and has audio
  - **Done when:** publish tests: bundle built in `wordIds` order; a draft word or missing example blocks the set; set-scope items never become rows; dry run reports set counts -- VERIFIED

- [x] T014 [B:T013] Add one small set to the e2e fixture content
  - **Done when:** `pnpm e2e:seed` publishes it and `/api/content/items?kind=set` returns it in the preview -- VERIFIED

### Chuyên ngành UI

- [x] T009 [B:T005,T006,T008,T014] Add the "Chuyên ngành" tab, set list and set view on `/vocabulary` (URL `?view=sets`, `?set=<slug>`), with "Học bộ này"/"Ngừng học bộ này" through `use-follow-set`
  - **Done when:** component tests cover the tab, list counts and learned numbers, set view progress, follow/unfollow writing the profile and the toast text; design direction from `ui-ux-pro-max` recorded in design.md -- VERIFIED

- [x] T010 [B:T009] Add the followed-set card to the home page, including the finished state
  - **Done when:** component tests show name and learned/total, the finished message with "Chọn bộ khác" and "Ngừng học bộ này", and no card when nothing is followed or the set is gone -- VERIFIED

- [x] T011 [B:T010] Add `e2e/vocabulary-sets.spec.ts`: open Chuyên ngành, open a set, follow it, start today's lesson and meet a set word; reload keeps the set open
  - **Done when:** the spec passes on the desktop and mobile projects -- VERIFIED

### Content for the three sets

- [x] T015 [B:T013] Draft the three sets in-session (Công nghệ thông tin, Tuyển dụng, Hành chính văn phòng): pick reused course words, draft new specialized words and examples, import as `draft`, generate the review sheets
  - **Done when:** each set has 90 to 120 words, `content:review approve set-<slug> --all --dry-run` reports every item valid, review sheets exist; publishing waits for owner approval and audio (owner gate) -- VERIFIED (drafts: it 105, recruitment 110, office 110 words; owner review, audio and publish pending)

## Requirements Coverage

| Requirement | Tasks |
| ----------- | ----- |
| AC-001 | T009 |
| AC-002 | T003, T009 |
| AC-003 | T008, T009 |
| AC-004 | T003, T007, T008 |
| AC-005 | T007 |
| AC-006 | T009, T011 |
| AC-007 | T009 |
| AC-008 | T005, T011 |
| AC-009 | T005, T011 |
| AC-010 | T005, T009 |
| AC-011 | T003, T010 |
| AC-012 | T004 |
| AC-013 | T010 |
| AC-014 | T009 |
| AC-015 | T013, T015 |
| AC-016 | T012 |
| AC-017 | T013 |
