---
id: 042
feature: claim-explanations
created: 2026-11-12
---

# Tasks: Explanations for approved wordings

## Summary

Total: 6 | Completed: 6 | Remaining: 0

## Execution Plan

```
T001 --> T002 --> T003
T004 -------------┘--> T005 --> T006
```

## Quality Gates

Run after each task or batch:

- `pnpm --filter learn-english lint`
- `pnpm --filter learn-english typecheck`
- `pnpm --filter learn-english test`

## Tasks

### Learner side

- [x] T001 Ask for and keep the AI's reason when correct; show it in the result (AC-001, AC-007)
  - **Done when:** translate-ai and runner tests pass

- [x] T002 [B:T001] Carry `aiExplanationVi` through the device queue, the snapshot and `/api/claims` into a new D1 column (migration 0013)
  - **Done when:** claims client and service tests pass

### Owner side

- [x] T003 [B:T002] Show the reason on the card; approve dialog with an editable reason; save it with the wording (AC-002 to AC-005)
  - **Done when:** admin service and tab tests pass

### Content and grading

- [x] T004 Add `explanationsVi` to the wording schema with the key check
  - **Done when:** schema test refuses a key that isn't accepted

- [x] T005 [B:T003, T004] Grader shows a matched wording's explanation (AC-006, AC-008)
  - **Done when:** translate tests pass

### Verify

- [x] T006 [B:all] Gates, local migration, publish dry run
  - **Done when:** gates pass and `pnpm content:publish --local --dry-run` accepts the content

## Requirements Coverage

| Requirement | Tasks |
| ----------- | ----- |
| AC-001 | T001, T002 |
| AC-002 | T003 |
| AC-003 | T003 |
| AC-004 | T003, T004 |
| AC-005 | T003 |
| AC-006 | T005 |
| AC-007 | T001 |
| AC-008 | T005 |
