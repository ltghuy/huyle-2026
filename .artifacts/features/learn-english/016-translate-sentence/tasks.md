---
id: 016
feature: translate-sentence
created: 2026-11-01
---

# Tasks: Translate a sentence into English

## Summary

Total: 12 | Completed: 12 | Remaining: 0

## Execution Plan

```
T001 --> T002 --> T003 --> T004 --> T005
  |                          
  +--> T006 [P] --> T007 --> T008 --> T009
  |                                    
  +--> T010 [P] --> T011
                          \
           T005, T009, T011 --> T012
```

## Quality Gates

Run after each task or batch (in `apps/learn-english`):

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build` (after T005, T009, T011, T012)

## Tasks

### Exercise core

- [x] T001 Add the `translate` kind, the `wording` content kind (schema, Drizzle enum, levelled) and `src/learning/exercises/translate.ts` with `answerKey`, `canTranslate`, `buildTranslate`, `gradeTranslate`, `canClaim`, plus tests
  - **Done when:** translate tests cover AC-002 forgiveness and nothing more, accepted orders, wordings and the length rule; typecheck passes

- [x] T002 [B:T001] Index `wording` items (`wordings` map, fetched per level) and add the `translate` case to `prepareStep` / `canPrepareSentenceStep` for `[sentence]` and `[card, sentence]` descriptors; export `bringForward`
  - **Done when:** session tests show a sentence step, a review step recording against the card, and an approved wording in `accepted`

- [x] T003 [B:T002] Build the View, registry entry (`claimOf`, `itemIdOf` with `cardId`) and add `claimed?` to `GradeResult`; `FeedbackPanel` claimed state
  - **Done when:** the library can render and grade a translate step (runner test: correct and wrong answers, AC-001, AC-003)

- [x] T004 [B:T003] Runner: hold the wrong claimable outcome until Continue, Claim or Exit; `handleClaim` updates result, score and retry list and calls `submitClaim` (stubbed until T007)
  - **Done when:** runner tests prove one outcome per step, correct+hinted after a claim, no retry for a claimed step, exit flushes (AC-006, AC-007)

- [x] T005 [B:T004] Plan it: `SENTENCE_KINDS`, `supports`, `STEP_SECONDS`, reserve 40 s, `reviewExercises` with `exampleOf`, `reviewSession`, library `SENTENCE_TYPES` and label
  - **Done when:** planner and library tests pass (AC-018, AC-019, AC-020); build passes

### Claims on the device

- [x] T006 [P] [B:T001] Add the `claims` IndexedDB store (`DB_VERSION` 3) with its repository, snapshot v4 (migration, build, parse), merge precedence, `replaceAll` and backup export/restore
  - **Done when:** storage, snapshot and merge tests cover the migration, precedence and restore

- [x] T007 [B:T006,T004] Write `src/claims/claims-client.ts`: `submitClaim` (dedupe), `flushClaims`, `checkClaims` (daily), rejection handling with `bringForward`, `dismissRejected`; wire the runner to it
  - **Done when:** client tests (fetch mocked) cover AC-008, AC-010 client rule, AC-015 to AC-017 and the edge cases (duplicate, offline, unknown ids)

- [x] T008 [B:T007] Add `ClaimsRunner` and the notice dialog, mount them in the `(app)` layout only (a notice mid-lesson in `(focus)` would interrupt the session; claims are sent at once from the runner and retried on the next app page)
  - **Done when:** component test shows the notice once with answer, reference and explanation, and "Đã hiểu" marks it shown

### Claims API

- [x] T009 [B:T008,T010] Hook the client to the real endpoints and run the full gate including build
  - **Done when:** lint, typecheck, test and build pass with the client calling `/api/claims` and `/api/claims/status`

- [x] T010 [P] [B:T001] Add the `claims` table (schema + `drizzle-kit generate` → `migrations/0004_claims.sql`), `CLAIMS_LIMITER` binding (`wrangler.jsonc`, `pnpm cf:typegen`), `claims.schema.ts`, `claims.service.ts` and both routes, with tests
  - **Done when:** service tests on `sqliteDb()` prove the 30/day limit, accepted ids, status read and retention; route tests cover validation, 413 and 429 (AC-009, AC-010)

### Owner tooling

- [x] T011 [B:T010] Write `scripts/claims.ts` (`pull` with Claude pre-judging and `--no-ai`, `apply`), `scripts/lib/claims-sheet.ts`, the `content:claims` script entry, and teach `publish-content.ts` / `review.ts` the `wording` kind
  - **Done when:** script tests cover grouping, dropping unknown sentences, auto-approving already-accepted wordings, the wording file and the SQL written by `apply` (AC-011 to AC-014); publish accepts a wording that points at a set sentence

### End to end

- [x] T012 [B:T005,T009,T011] Add the e2e fixture wording and `e2e/specs/translate.spec.ts`; update README (pipeline step), feature 001 spec notes and `.agents/knowledge.md` (rollout gotchas)
  - **Done when:** `pnpm e2e` passes the translate spec; docs updated

## Requirements Coverage

| Requirement | Tasks |
| ----------- | ----- |
| AC-001 | T003 |
| AC-002 | T001 |
| AC-003 | T003 |
| AC-004 | T001, T002, T011 |
| AC-005 | T002, T004 |
| AC-006 | T003, T004 |
| AC-007 | T004, T007 |
| AC-008 | T007 |
| AC-009 | T010 |
| AC-010 | T001, T007, T010 |
| AC-011 | T011 |
| AC-012 | T011, T012 |
| AC-013 | T011 |
| AC-014 | T011 |
| AC-015 | T007, T008 |
| AC-016 | T007 |
| AC-017 | T007 |
| AC-018 | T005 |
| AC-019 | T005 |
| AC-020 | T005 |
