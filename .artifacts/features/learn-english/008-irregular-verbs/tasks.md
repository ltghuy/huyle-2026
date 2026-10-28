---
id: 008
feature: irregular-verbs
created: 2026-10-28
---

# Tasks: Irregular verbs

## Summary

Total: 9 | Completed: 8 | Remaining: 1

## Execution Plan

```
T001 --> T002 --> T003 (owner review) --> T004
T001 --> T005 --> T006 --> T007 --> T008
                            T004 ---------┴--> T009
```

## Quality Gates

Run after each task or batch:

- `pnpm --filter learn-english lint`
- `pnpm --filter learn-english typecheck`
- `pnpm --filter learn-english test`

## Tasks

### Content

- [x] T001 Add the `forms` content kind (revised from a field on the word body, see design) and `src/learning/verbs.ts` (`patternOf`, `formsIdOf`, `acceptedForms`, `formsSequence`, `listeningDistractors`); with tests
  - **Done when:** schema tests accept a full `forms`, refuse an empty `past`; pattern tests cover AAA, ABB, ABA, ABC and variants -- DONE 2026-10-28: `src/learning/verbs.test.ts` (21 tests); draft import, review sheet, publish references and missing audio handle `forms`
- [x] T002 [B:T001] Draft forms for the 108 verbs (past, participle, variants with region, Vietnamese notes, 2 practice sentences each) and the word "sting" (B2) as drafts; import with `content:draft import`
  - **Done when:** `content:draft import --check` passes; a review sheet per level lists every verb -- DONE 2026-10-28: 108 forms drafts (A1 60, A2 23, B1 20, B2 5) and `word:sting-v` with 2 sentences imported as drafts; sheets in `content/.review/{A1,A2,B1,B2}.html`
- [x] T003 [B:T002] Owner reviews and approves the drafts (`content:review sheet` / `approve`)
  - **Done when:** all 108 verbs and "sting" are approved -- DONE 2026-10-28: approved by the owner (`content:review approve <level> --all`): 108 forms, `word:sting-v` and its 2 sentences
- [ ] T004 [B:T003] Extend `build-ipa.ts` and `generate-audio.ts` for `forms`; generate IPA and the 108 "base, past, participle" clips; deploy audio; publish (local, then remote with the owner)
  - **Done when:** every approved verb has IPA per form and an audio key; `content:publish --dry-run` is clean -- PROGRESS 2026-10-28: `build-ipa.ts` fills form IPA (same spelling takes the approved base IPA; "read" → /rɛd/; "forbidden" fixed by hand to /fɚˈbɪdən/), 0 forms missing; `generate-audio.ts` makes "go, went, gone" clips (Kokoro am_adam, 111 clips in 74 s, keys saved); published locally (content v8: 108 forms). Left: `content:audio deploy` and `content:publish --remote`, with the owner

### App

- [x] T005 [B:T001] Add the `forms:` card id: types, `record.ts`, snapshot v2 (v1 migrates; v3 refused), `reviewExercises` and `prepare.ts` routing; with tests
  - **Done when:** a forms answer creates `forms:X` without touching `word:X`; backup and sync tests pass for v1 and v2 -- DONE 2026-10-28: `session.test.ts`, `snapshot.test.ts` (v1 reads as v2, v3 refused), `lesson-plan.test.ts` (the daily lesson leaves forms cards to Ôn tập)
- [x] T006 [B:T005] Write the three exercise kinds (`forms-typing`, `forms-gap`, `forms-listening`): builders, graders, views, registry; with tests
  - **Done when:** each kind builds from fixtures, accepts variants and typos as specified, and renders in the runner -- DONE 2026-10-28: `src/learning/exercises/forms.ts` (+10 tests), `src/components/exercise/forms-exercises.tsx`, runner tests for the three views
- [x] T007 [B:T006] `ui-ux-pro-max` direction, then the `/irregular-verbs` page: table/cards, pattern chips, level tabs, search, verb dialog, practice sets; menu item; with tests
  - **Done when:** page tests filter by pattern and level, search forms and meaning, and start a practice set -- DONE 2026-10-28: `src/components/verbs/` (browser, dialog, practice sets of 10), `useVerbs`, menu item, sitemap; `verbs-browser.test.tsx` (7 tests); checked in the browser at 1280px and 390px in dark mode with the drafts served to the page only
- [x] T008 [B:T007] Links from Past Simple, Present Perfect and Past Perfect and from the word dialog; forms count in Hồ sơ; with tests
  - **Done when:** the links render for those topics and for verbs with forms; Hồ sơ shows learned forms per level -- DONE 2026-10-28: `TOPICS_USING_FORMS` + callout in `grammar-topic.tsx`, forms block in `word-dialog.tsx`, "Động từ bất quy tắc đã học" card in Hồ sơ (hidden until forms are published); tests in the grammar, vocabulary and profile suites; checked in the browser

### Verify

- [x] T009 [B:T004,T008] Add two verbs with forms to the e2e fixture content; e2e for the page and practice; all gates; browser check at phone and desktop width
  - **Done when:** lint, typecheck, unit, e2e and build pass; screenshots of the page, a verb and each exercise kind -- DONE 2026-10-28 (ahead of T004: the fixture verbs have no audio, the screenshots used the drafts served to the test browser with placeholder clip keys): fixture verbs go and eat in `scripts/fixtures/content/{word,sentence}/A1-verbs.json` and `forms/A1.json` (separate files, so the script tests that read the base `A1.json` files keep their counts), `e2e/specs/irregular-verbs.spec.ts` (2 specs; 12 e2e specs pass); screenshots of the page (desktop, phone), the dialog and the three kinds

## Requirements Coverage

| AC | Tasks |
|----|-------|
| AC-001–AC-006 | T001, T007 |
| AC-007, AC-010, AC-011 | T006, T007 |
| AC-008, AC-009 | T005 |
| AC-012, AC-013 | T008 |
| AC-014, AC-015 | T005 |
| AC-016 | T008 |
| Success: all verbs published | T002–T004 |
