---
id: 033
feature: ai-translation-grading
created: 2026-11-09
---

# Tasks: AI grading for "Dịch câu" with the learner's own key

## Summary

Total: 12 | Completed: 12 | Remaining: 0

## Execution Plan

```
T001 --> T002 --> T004 --> T006 --> T007 --┐
         T003 ----┘         T005 ----------┼--> T011 --> T012
T008 --> T009 ------------------------------┤
T010 ---------------------------------------┘
```

## Quality Gates

Run after each task or batch:

- `pnpm --filter learn-english lint`
- `pnpm --filter learn-english typecheck`
- `pnpm --filter learn-english test`
- `pnpm --filter learn-english build` (after T007, T009 and T011)

## Tasks

### Google API facts

- [x] T001 Probe `generateContent` on `gemini-3.5-flash-lite` with a real AI Studio key (owner's): which JSON-output field form is accepted (`responseFormat` or `responseMimeType` + `responseJsonSchema`), the casing of `thinkingLevel`, a sample reply, and a real 429 body if one can be provoked. Record the answers in the research file and close the design's open question
  - **Done when:** the research file's Uncertainties list the probe result, and the request shape in design.md is final
  - **Resolved without a probe (2026-11-09):** no key was available, so the client sends `responseMimeType` + `responseJsonSchema` first and switches to `responseFormat` for the tab on a 400 that isn't a key error; the reply text is always parsed with Zod either way

### Pure rules and the key store

- [x] T002 [B:T001] Write `src/learning/exercises/translate-ai.ts` (request builder, reply parser, failure classifier, Pacific midnight, usable-key order, constants) with its tests
  - **Done when:** `translate-ai.test.ts` covers every scenario in design.md's New Tests row and passes

- [x] T003 [P] Write `src/lib/ai-keys.ts` (localStorage store with memory fallback, add/remove/move/update, cap 5, listeners) with its tests, and add its key to `DEVICE_KEYS` in `src/storage/replace.ts`
  - **Done when:** `ai-keys.test.ts` and the extended `replace.test.ts` pass

### Gemini client

- [x] T004 [B:T002,T003] Write `src/ai-grading/gemini-client.ts` (`checkAiKey`, `gradeWithAi` with rotation, status updates, 8 s budget, abort) with fetch-mocked tests
  - **Done when:** `gemini-client.test.ts` passes, including "only Google receives the key"

### Claims carry a source

- [x] T005 [P] Add `source` end to end: `CLAIM_SOURCES`, request schema default, `migrations/0009_claim_source.sql`, Drizzle column, service insert, `StoredClaim.source`, snapshot schema, claims client payload
  - **Done when:** claims client, service and snapshot tests cover `source` (sent, stored, defaulted, kept through a backup) and pass; `pnpm exec wrangler d1 migrations apply learn-english --local` applies 0009

### Runner and feedback

- [x] T006 [B:T004] Add `aiGraded`/`aiUnavailable` to `GradeResult`, `Entry.aiGrade` to the registry, `checking` to the view props
  - **Done when:** typecheck passes with the translate entry wired to `gradeWithAi`

- [x] T007 [B:T005,T006] Runner second pass (ms before the call, `checking` state, abort on leave, AI-correct record + `source: "ai"` claim, AI-wrong hold, fallback notice), translate view and feedback panel changes
  - **Done when:** extended `exercise-runner.test.tsx` scenarios pass, and the Arena test shows a valid non-matching wording stays wrong with keys set (AC-012)

### Owner review

- [x] T008 [P] Claim script: read `source`, `aiCount` per group, show it in the pull summary and the claims file
  - **Done when:** `scripts/claims.test.ts` covers `aiCount` and passes

- [x] T009 [B:T008,T005] Run `content:claims pull --no-ai` against the local D1 with one learner and one AI claim
  - **Done when:** the summary and the claims file show the AI count

### Settings and privacy

- [x] T010 [P] [B:T003] "Chấm điểm bằng AI" card in Cài đặt (explanation per AC-001, add with check, masked list with status, reorder, remove, blocked-storage notice) and the privacy page text; update the page descriptions
  - **Done when:** `ai-grading-setting.test.tsx` passes and the card works at 375 px and in dark mode (checked in the browser)

### End to end and docs

- [x] T011 [B:T007,T009,T010] Extend `e2e/specs/translate.spec.ts` with Google stubbed: add a key, AI-correct wording, daily 429 failover, all-keys-out fallback
  - **Done when:** `pnpm --filter learn-english e2e` passes

- [x] T012 [B:T011] Docs: pointer to 033 in 001 decisions.md and 016 spec.md, update `.agents/baselines/learn-english/exercise-runner.md`, mark verified ACs, set spec to `to-review`
  - **Done when:** every AC is `[x]` with evidence in the spec notes and the gates pass

## Requirements Coverage

| Requirement | Tasks |
| ----------- | ----- |
| AC-001 | T010 |
| AC-002 | T003, T004, T010 |
| AC-003 | T003, T010 |
| AC-004 | T003 |
| AC-005 | T003, T004, T005 |
| AC-006 | T003, T007 |
| AC-007 | T007 |
| AC-008 | T007 |
| AC-009 | T007 |
| AC-010 | T007 |
| AC-011 | T007 |
| AC-012 | T007 |
| AC-013 | T002, T004 |
| AC-014 | T002, T004 |
| AC-015 | T002, T003 |
| AC-016 | T004, T007 |
| AC-017 | T005, T007 |
| AC-018 | T008, T009 |
| AC-019 | T005 |
| AC-020 | T010 |
