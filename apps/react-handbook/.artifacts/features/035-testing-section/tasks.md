---
id: "035"
feature: testing-section
created: 2026-10-21
---

# Tasks: Testing section + "Testing strategy"

## Summary

Total: 9 | Completed: 9 | Remaining: 0

## Execution Plan

```
T001 --> T002 --> T003 ──┬--> T004 --┐
                         ├--> T005 --┤
                         ├--> T006 --┼--> T009
                         ├--> T007 --┤
                         └--> T008 --┘
```

## Quality Gates

Run after each task or batch:

- pnpm lint
- pnpm typecheck
- pnpm build (after T003 and T009)

## Tasks

### Section wiring

- [x] T001 Add the `testing` section, its four pages, the dates union and `findTopicPage` to the catalog; add the icon and the sidebar folder
  - **Done when:** typecheck passes and the sidebar lists a Testing folder with four pages

- [x] T002 [B:T001] Add the section route, the fallback route for unwritten pages, and a skeleton strategy page with intro and Toc
  - **Done when:** `/testing`, `/testing/strategy` and `/testing/e2e-playwright` render; build lists the three unwritten slugs as static

- [x] T003 [B:T002] Update home copy and references, and the README sections table
  - **Done when:** the home Testing card shows "1 of 4 pages written" and links to the section

### Topics and demos

- [x] T004 [B:T003] [P] Harness, `TestResults`, price sample and the "why test" topic with its demo
  - **Done when:** each bug fails a behaviour test, each refactor passes them, and the callout names false alarms and missed bugs

- [x] T005 [B:T003] [P] Suite model and the levels and shapes topic with its demo
  - **Done when:** presets and counts update outputs; all zero shows "nothing caught" without NaN

- [x] T006 [B:T003] [P] Cases and the classification topic with its demo
  - **Done when:** every case shows recommendation and reason after checking, and the summary counts placed cases

- [x] T007 [B:T003] [P] Search contract, service and route, and the test doubles topic with its demo
  - **Done when:** curl gives 200 for valid params and 422 for bad ones; with v2 the mock passes and the fake and real fail

- [x] T008 [B:T003] [P] Pipeline model and the "where tests run" topic with its demo
  - **Done when:** moving kinds between stages updates feedback time, unchecked kinds and the slow pre-commit warning

### Verify

- [x] T009 [B:T004,T005,T006,T007,T008] Verify against the spec: browser checks, axe in both themes, 360 px, keyboard, quality gates
  - **Done when:** every AC is proven and marked in spec.md

## Requirements Coverage

| Requirement | Tasks |
| ----------- | ----- |
| AC-001 | T001, T003 |
| AC-002 | T001, T002 |
| AC-003 | T002 |
| AC-004, AC-005 | T004 |
| AC-006, AC-007 | T005 |
| AC-008, AC-009 | T006 |
| AC-010, AC-011 | T007 |
| AC-012 | T008 |
| AC-013 | T004 to T008 |
