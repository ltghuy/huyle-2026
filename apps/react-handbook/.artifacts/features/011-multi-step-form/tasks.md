---
id: "011"
feature: multi-step-form
created: 2026-10-07
---

# Tasks: Multi-Step Form

## Summary

Total: 10 | Completed: 10 | Remaining: 0

## Execution Plan

```
T001 --> T002 --> T003 ----------------┐
   └---> T004 --> T005 --> T006 --> T007 --> T008 --> T009 --> T010
```

T002 (API) and T004 (store + steps) both build on T001's rules. T003 (draft) needs T004. Everything after T005 is the UI, step by step.

## Quality Gates

Run after each task or batch:

- `pnpm lint`
- `pnpm typecheck`
- `pnpm build` (catches the `useSearchParams` Suspense requirement, which dev doesn't show)
- Task-specific checks: jiti scripts for pure modules, fetch scripts for the API, Puppeteer for UI

## Tasks

### Rules and server

- [x] T001 Write the shared rules: step ids, option lists, per-step schemas, cross-step rule, applicability, `validateApplication(values, today)`, strict body schema, `FieldIssue`, query schemas, sample values
  - **Done when:** a jiti script shows valid samples pass, each rule fails with the right path and step, the cross-step start rule fires on the later step, and non-applicable step data is reported (AC-007, AC-012, AC-013, AC-027 rules) -- VERIFIED

- [x] T002 [B:T001] Add the server store (used emails, application counter on `globalThis`, outcomes) and the email-check and applications routes
  - **Done when:** a fetch script gets 201 for the sample, 400 for bad JSON, 422 with step/field for ≥ 20 tampered bodies (missing steps, wrong types, ranges, non-applicable steps, unknown keys, used email), and the four outcomes behave as named; email check answers taken/available (AC-025 server, AC-027, AC-029) -- VERIFIED

### Engine

- [x] T004 [B:T001] Build paths, steps (`applicableSteps`, `reachableSteps`, `firstInvalidStep`), and the form store with per-field subscriptions, visited/attempted, server errors and sample fill
  - **Done when:** jiti checks reachability for empty, partial, complete and role-switched values, `furthest` clamping, and that non-applicable answers are kept in the store but excluded from the body slice (AC-006, AC-014, AC-015 logic) -- VERIFIED

- [x] T003 [B:T004] Build the draft module: loose schema, v1 migration, read/write/clear with storage errors handled, debounced autosave, restore-step choice, v1 and corrupted samples
  - **Done when:** jiti checks a v2 round trip, v1 migration with 0 differences, corrupted/junk drafts discarded with a reason, rule-breaking values kept, and only applicable steps saved (AC-016, AC-017 choice, AC-019, AC-020 logic) -- VERIFIED

### UI

- [x] T005 [B:T002,T003,T004] Add shadcn primitives (label, checkbox, radio-group, progress), field wrappers, error summary, step address hook, wizard shell with hydration gate, progress indicator, Personal and Role steps, page route, catalog flag
  - **Done when:** in the browser, Next on an empty step shows errors + summary with focus on it; errors appear on blur and update while typing; Next/Back/progress move steps with focus on the heading and the address updating; browser Back/Forward and refresh work; deep links are corrected with `replaceState`; build passes with the Suspense boundary (AC-001–006, AC-021–024, AC-035) -- VERIFIED

- [x] T006 [B:T005] Add the email check (debounce, abort, stale guard, cache) on Personal and Next waiting for it
  - **Done when:** typing shows "Checking…" then the answer; a slow stale answer is ignored; a taken email blocks Next; a pending check makes Next wait; a failed check retries (AC-025, AC-026) -- VERIFIED

- [x] T007 [B:T005] Add Experience (list editor with add/remove/move, 5 max, "no experience"), Engineering, Design, Work authorization and Extras steps
  - **Done when:** steps appear and disappear with the role and sponsorship answers, Step X of N updates, answers come back when switching back, the cross-step start rule marks Work authorization as needing attention, and the list editor is keyboard operable (AC-007, AC-012–015, AC-034 for the list) -- VERIFIED

- [x] T008 [B:T006,T007] Add Review (groups with Edit, Back to review, consent), submit flow (client re-check, POST, 422 mapping, failure with Retry, single submission), confirmation, draft status (saved time, restored notice, Start over with confirm, storage warning + leave guard)
  - **Done when:** Review lists only applicable answers; Edit → Back to review works; each server outcome behaves as specified; Back from confirmation doesn't reopen the answers; the draft saves within 1 s, restores on reload, Start over confirms and clears (AC-008–011, AC-016–020, AC-028) -- VERIFIED

### Learning layer

- [x] T009 [B:T008] Add the form inspector, demo controls (latency, outcome, sample fill, clear draft, load v1/corrupted draft), the explanation guide, and the phone layout
  - **Done when:** the inspector updates live; every control works; the guide follows the playground format and covers the Notes topics; at 360 px the compact progress shows and nothing scrolls sideways (AC-030–033) -- VERIFIED

- [x] T010 [B:T009] Full verification and knowledge
  - **Done when:** every AC is verified and marked in spec.md, all success criteria have evidence ready for the audit (keyboard-only run, reload/Back/Forward on every step, deep links, ≥ 20 tampered requests, server errors per field, role switching ×10, axe light/dark at 360 px), quality gates pass, and `.agents/knowledge.md` has this feature's decisions and gotchas -- VERIFIED

## Requirements Coverage

| Requirement | Tasks |
| ----------- | ----- |
| AC-001 | T005 |
| AC-002 | T005 |
| AC-003 | T005 |
| AC-004 | T005 |
| AC-005 | T005 |
| AC-006 | T004, T005 |
| AC-007 | T001, T007 |
| AC-008 | T008 |
| AC-009 | T008 |
| AC-010 | T008 |
| AC-011 | T008 |
| AC-012 | T001, T007 |
| AC-013 | T001, T007 |
| AC-014 | T004, T007 |
| AC-015 | T004, T007 |
| AC-016 | T003, T008 |
| AC-017 | T003, T008 |
| AC-018 | T008 |
| AC-019 | T003 |
| AC-020 | T003, T008 |
| AC-021 | T005 |
| AC-022 | T005 |
| AC-023 | T005 |
| AC-024 | T005 |
| AC-025 | T002, T006 |
| AC-026 | T006 |
| AC-027 | T001, T002 |
| AC-028 | T008 |
| AC-029 | T002 |
| AC-030 | T009 |
| AC-031 | T009 |
| AC-032 | T009 |
| AC-033 | T009 |
| AC-034 | T007, T009 |
| AC-035 | T005 |
