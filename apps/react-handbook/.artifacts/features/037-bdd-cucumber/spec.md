---
id: "037"
feature: bdd-cucumber
type: brownfield
scope: large
status: done
branch: main
created: 2026-10-21
---

# Feature: Testing section, Behaviour-driven tests with Cucumber

## Overview

Product owners, designers and testers rarely read test code, so they cannot
tell what the tests check or whether a rule they care about is covered.
Behaviour-driven development writes examples of the behaviour in plain
language first (Given, When, Then), agrees on them with the people who own the
rules, and then runs those same sentences as tests. Done well, the scenarios
become documentation everyone trusts. Done badly, they are slow scripts full
of click steps that nobody outside the team reads.

This feature writes the third Testing page and adds real Gherkin feature
files to this repo. They run as part of the end-to-end suite from feature 036,
reusing its page objects through step definitions. The page quotes those
files, shows them as readable documentation with the latest result of each
scenario, and lets the learner write a scenario in the browser and see which
of its steps the suite already knows how to run.

## Goals

- [x] Real feature files for at least two flows of this site run with the end-to-end suite command and pass.
- [x] A reader who does not write code can open the page and read what each scenario checks and whether it passed in the latest run.
- [x] Each of the five topics fits on about one screen of reading (plus a "read more") and has a demo whose result changes with the learner's input.

## Out of Scope

| Feature | Reason |
|---------|--------|
| A separate test runner just for the feature files | The scenarios run inside the same suite and command as feature 036 |
| Editing the repo's feature files from the page | The page shows them read-only; the learner's own scenario lives only in their browser |
| Running a learner's scenario against the site from the page | A browser test runner cannot run inside a visitor's tab; the page checks the scenario against the known steps instead |
| Gherkin in languages other than English | Mentioned in "read more" only |
| Integrations with test management or ticket tools | Out of the handbook's scope |

## User Stories

### P1: Real scenarios in the repo

- As a learner, I want real feature files in this repo that run against the site, so that the page explains scenarios that actually execute.
- **Why P1:** The page is built on them.
- **Independent Test:** Run the suite command; the scenarios run with the other tests and appear in the run summary.

**Acceptance Criteria:**

- [x] AC-001: WHEN the suite command runs THEN the feature files SHALL run as part of it, each scenario reported as its own test with its feature and scenario name in the run summary.
- [x] AC-002: WHEN a scenario step runs THEN its step definition SHALL drive the page through the page objects from the end-to-end suite, with no element lookups of its own.
- [x] AC-003: WHEN the feature files are written THEN they SHALL cover at least two flows of this site (for example the multi-step form's rules and the shopping cart's discount codes) and use a background, a scenario outline with an examples table, and tags.

### P1: Reach the page

- **Why P1:** Navigation.

**Acceptance Criteria:**

- [x] AC-004: WHEN the page is written THEN the Testing section page, the sidebar and the home card SHALL list it, and the strategy and end-to-end pages SHALL link to it.

### P1: Gherkin for everyone

- As a product owner or tester, I want the scenarios shown as plain documentation with their latest result, so that I can check the rules without reading code.
- **Why P1:** This is the reason to use the format at all.
- **Independent Test:** Open the page, find the discount code feature, and read which scenarios passed in the latest run.

**Acceptance Criteria:**

- [x] AC-005: WHEN the topic is shown THEN it SHALL explain the parts of a feature file (feature, rule, background, scenario, scenario outline with examples, Given, When, Then, And, tags) using the repo's own files.
- [x] AC-006: WHEN the living documentation view is shown THEN it SHALL list every feature file from the repo as readable text, with each scenario's result, duration and run date from the latest recorded run, and a filter by tag; WHEN a scenario has no recorded result THEN it SHALL say so.

### P1: From sentence to code

- As a learner, I want to see how a step sentence finds the code that runs it, so that I can add steps without duplicating them.
- **Why P1:** Step definitions are where most suites go wrong.
- **Independent Test:** Click a step in the documentation view and see the step definition it matched and the page object call behind it.

**Acceptance Criteria:**

- [x] AC-007: WHEN the learner selects a step in a scenario THEN the page SHALL show the step definition it matches, the values it captured from the sentence, and the page object methods that step calls, quoted from the repo.
- [x] AC-008: WHEN the topic is shown THEN it SHALL explain parameters in step patterns, why one step should match exactly one definition, and how to share state between steps of one scenario without sharing it between scenarios.

### P1: Write a scenario

- As a learner, I want to write a scenario in the browser and see which steps the suite can already run, so that I practise writing steps that reuse existing ones.
- **Why P1:** The hands-on part of the page.
- **Independent Test:** Write a scenario with one known step and one new step; the new one is marked undefined with a suggested definition skeleton.

**Acceptance Criteria:**

- [x] AC-009: WHEN the learner types a scenario THEN the page SHALL check it as they type and report syntax errors in plain words with the line number.
- [x] AC-010: WHEN the scenario is valid THEN the page SHALL match each step against the suite's real step definitions and mark it as matched (with the captured values), undefined (with a suggested skeleton) or ambiguous (with the definitions that clash).
- [x] AC-011: WHEN the learner's scenario is a scenario outline THEN the page SHALL expand it into one scenario per examples row and check each.

### P1: Writing good scenarios

- As a learner, I want feedback on whether my scenario describes behaviour or clicks, so that the scenarios stay readable and stable.
- **Why P1:** Imperative click-by-click scenarios are the most common failure of this approach.
- **Independent Test:** Write a scenario that names buttons and fields; the page flags it as imperative and shows a declarative version.

**Acceptance Criteria:**

- [x] AC-012: WHEN the learner's scenario names interface details (buttons, fields, pages), has more than one action step, has many steps, or checks things the user cannot see THEN the page SHALL point each out with a short reason.
- [x] AC-013: WHEN the topic is shown THEN it SHALL show the same rule written imperatively and declaratively, and explain when an end-to-end scenario is the wrong level for a rule (a pure calculation is better tested below the interface).

### P2: When behaviour-driven development is worth it

- **Why P2:** Senior judgement, but the page works without it.

**Acceptance Criteria:**

- [x] AC-014: WHEN the topic is shown THEN it SHALL explain discovery with examples before code (the "three amigos" conversation), who reads and who writes the scenarios, and the signs that a team gets no value from the format (nobody outside engineering reads them, scenarios mirror the interface).

### P3: Notes and reading

- **Why P3:** Polish.

**Acceptance Criteria:**

- [x] AC-015: WHEN a topic is shown THEN it SHALL end with a short "read more" (tag-based runs, data tables and doc strings, Gherkin in other languages, reports) and links to the sources it draws from.

## Edge Cases

- WHEN the learner's text is empty or very long THEN the checker SHALL stay responsive and say what is missing.
- WHEN the learner's draft is lost on reload THEN nothing is lost from the repo; the draft MAY be kept in their browser only.
- WHEN a feature file in the repo changes after the latest recorded run THEN the documentation view SHALL show results only for scenarios that still match by name and mark the rest as not yet run.

## Success Criteria

- [x] Every scenario in the repo passes with the suite command, and each appears in the run summary.
- [x] A step the suite already defines is never reported as undefined by the checker, and a step it does not define always is.
- [x] The page passes axe in light and dark themes, works at 360 px width without horizontal scroll, and every demo can be used with the keyboard.
- [x] `pnpm typecheck`, `pnpm lint` and `pnpm build` pass, and the suite command passes.

## Open Questions

- None

## Notes

The subject of this page is a specific format and tool, so the spec names them. Depends on feature 036 (the suite, its page objects and its run summary).

## Baseline

### Current Behavior

- After feature 036 the repo has an end-to-end suite written in code only.

### Gaps / Limitations

- People who do not read code cannot see what the suite checks.
