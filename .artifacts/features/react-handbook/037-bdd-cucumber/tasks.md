---
id: "037"
feature: bdd-cucumber
created: 2026-10-21
---

# Tasks: Behaviour-driven tests with Cucumber

## Summary

Total: 5 | Completed: 5 | Remaining: 0

## Tasks

- [x] T001 Install playwright-bdd and the Gherkin packages; add the scenarios project, `bddgen`, and the fixture base change
  - **Done when:** `pnpm test:e2e` generates and runs scenarios next to the specs
- [x] T002 [B:T001] Feature files, step definitions and the cart page object; reporter maps scenarios to their features
  - **Done when:** 21 tests pass three runs in a row and scenarios are recorded under their feature
- [x] T003 [B:T002] Gherkin helpers, living documentation and the step inspector and library
  - **Done when:** every scenario and examples row shows its latest result; selecting a step shows its definition
- [x] T004 [B:T003] Scenario editor with expansion, matching and lint; the worth-it check
  - **Done when:** syntax errors, undefined steps and lint findings show for the sample texts
- [x] T005 [B:T004] Content, route, catalog, README; verify in the browser, axe, 360 px, gates
  - **Done when:** every AC is proven and marked

## Requirements Coverage

| Requirement | Tasks |
| ----------- | ----- |
| AC-001 to AC-003 | T001, T002 |
| AC-004 | T005 |
| AC-005 to AC-008 | T003 |
| AC-009 to AC-014 | T004 |
| AC-015 | T005 |
