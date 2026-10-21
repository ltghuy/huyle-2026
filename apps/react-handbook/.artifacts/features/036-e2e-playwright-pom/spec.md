---
id: "036"
feature: e2e-playwright-pom
type: brownfield
scope: large
status: draft
branch: main
created: 2026-10-21
---

# Feature: Testing section, End-to-end testing with Playwright and the Page Object Model

## Overview

End-to-end tests give the most confidence and cause the most pain: they are
slow, they break when a label changes, and they fail at random in CI. Senior
interviews ask how to choose locators, why fixed waits cause flaky tests, how
to keep a large suite maintainable with page objects, and how to debug a
failure that only happens in CI.

This feature writes the second Testing page and adds a real end-to-end suite
to this repo, written with Playwright and organised with page objects. The
suite tests real pages of this site, so the handbook page explains code that
exists and runs here. The page quotes the suite's files directly, so the
quoted code cannot drift from the code that runs, and it shows the results of
the suite's latest run. In-browser demos cover what a browser test runner
cannot show live on a deployed page (locator matching, waiting strategies,
the cost of a renamed label), and simplified models are labelled.

## Goals

- [ ] One command runs a real end-to-end suite against this site, using page objects, and the suite passes.
- [ ] The page quotes the suite's own files and shows its latest recorded run (tests, results, duration, retries and when it ran).
- [ ] Each of the five topics fits on about one screen of reading (plus a "read more") and has a demo whose result changes with the learner's input.

## Out of Scope

| Feature | Reason |
|---------|--------|
| Running the suite from the deployed site | A browser test runner cannot run inside a visitor's tab; the page shows recorded runs and in-browser demos instead |
| A CI pipeline for this repo | The page explains how to run the suite in CI with an example; adding a pipeline is a separate decision |
| Gherkin feature files | Feature 037 builds on this suite |
| Testing every page of the site | The suite covers a handful of representative flows; it teaches, it does not chase coverage |
| Cross-browser runs in the default command | The default run uses one browser to stay fast; the page shows how to add the others |
| Visual regression snapshots | Mentioned in "read more" only |

## User Stories

### P1: A real suite in the repo

- As a learner, I want a working end-to-end suite in this repo that tests its real pages, so that I can read, run and change real tests.
- **Why P1:** The page is built on it.
- **Independent Test:** Run the suite command on a fresh clone after the one-time browser install; all tests pass and a report is written.

**Acceptance Criteria:**

- [ ] AC-001: WHEN a developer runs the suite command THEN it SHALL start this site, run the end-to-end tests against it in a real browser and exit with success when they pass; the README SHALL describe the one-time browser install and the command.
- [ ] AC-002: WHEN the suite runs THEN it SHALL cover at least four flows from this site (for example the debounced search with a stale response, the multi-step form with validation and back navigation, the accessible modal's focus trap and Escape, and a toast that pauses on hover), each test independent of the others.
- [ ] AC-003: WHEN a test touches a page THEN it SHALL do so through a page object for that page; tests SHALL hold the steps and assertions, page objects SHALL hold how to find and drive elements.
- [ ] AC-004: WHEN the suite finishes THEN it SHALL record a summary of the run (each test with its result, duration and retries, the totals, the browser and when it ran) that the handbook page reads.

### P1: Reach the page

- **Why P1:** Navigation.

**Acceptance Criteria:**

- [ ] AC-005: WHEN the page is written THEN the Testing section page, the sidebar and the home card SHALL list it, and the strategy page SHALL link to it.

### P1: What an end-to-end test proves

- As a learner, I want to see how a browser test drives the page and what it checks, so that I know what this level buys over the lower ones.
- **Why P1:** The base every other topic stands on.
- **Independent Test:** Read the quoted search test next to the latest run's result for it.

**Acceptance Criteria:**

- [ ] AC-006: WHEN the topic is shown THEN it SHALL explain the runner's model (a browser, an isolated context per test, a page) and quote one real test from the suite with its page object, with the latest run's result for that test.
- [ ] AC-007: WHEN the latest run summary is shown THEN it SHALL list every test with result, duration and retries, the totals and the run date; WHEN no run has been recorded THEN it SHALL say so and show the command to create one.

### P1: Locators

- As a learner, I want to try locators against a sample form and see what each one matches, so that I choose locators that survive redesigns.
- **Why P1:** Locator choice decides whether a suite is stable.
- **Independent Test:** Locate the submit button by role and name, then by a CSS class; rename the class and see which locator still finds it.

**Acceptance Criteria:**

- [ ] AC-008: WHEN the learner enters a locator of a given kind (role and accessible name, label, visible text, test id, CSS) THEN the page SHALL highlight every matching element in a sample form shown beside it and say how many matched; WHEN more than one matches THEN it SHALL explain that a strict locator would fail and how to narrow it.
- [ ] AC-009: WHEN the learner applies a change to the sample form (rename a class, reword a button, wrap a field, translate the labels) THEN the page SHALL show which of the learner's locators still match the same element and which broke, and rank the kinds by how well they held up.

### P1: Waiting and flaky tests

- As a learner, I want to run the same check with a fixed sleep, a manual poll and an auto-waiting assertion against a page that responds at varying speed, so that I see where flakiness comes from.
- **Why P1:** Flaky tests are the main complaint about end-to-end suites.
- **Independent Test:** Run each strategy fifty times with high latency variance and compare failure rates and total time.

**Acceptance Criteria:**

- [ ] AC-010: WHEN the learner sets the sample page's response delay and variance and runs a strategy a chosen number of times THEN the page SHALL really run the check in the browser that many times and show passes, failures and total time per strategy.
- [ ] AC-011: WHEN the fixed sleep fails or wastes time THEN the page SHALL say which, and explain that auto-waiting assertions retry until a timeout, so they pass as soon as the page is ready and fail only when it never gets there.
- [ ] AC-012: WHEN the topic is shown THEN it SHALL list the other common causes of flakiness (shared state between tests, animations, test order, time and randomness, network the test does not control) with the fix for each.

### P1: Page objects

- As a learner, I want to see the same test with and without page objects and what a UI change costs each, so that I know when page objects are worth it.
- **Why P1:** The Page Object Model is half of this page's title.
- **Independent Test:** Apply "rename the Next button" and count the lines to edit in each version.

**Acceptance Criteria:**

- [ ] AC-013: WHEN the topic is shown THEN it SHALL quote a page object from the suite and the test that uses it, beside the same test written without a page object, and explain what belongs in a page object (finding and driving elements, page-level actions) and what does not (assertions about business rules, test data).
- [ ] AC-014: WHEN the learner picks a UI change (rename a button, move a field to another step, split a page into two) THEN the page SHALL highlight the lines each version must change and count them, using the quoted code.
- [ ] AC-015: WHEN the topic is shown THEN it SHALL show how page objects compose (a component object reused by several pages) and are handed to tests by fixtures, quoting the suite's own fixture.

### P2: Running in CI and debugging failures

- As a learner, I want to know how to run the suite in CI and read a failure, so that a red build is quick to fix.
- **Why P2:** Senior-level, but the page works without it.

**Acceptance Criteria:**

- [ ] AC-016: WHEN the learner sets the number of tests, the average test time and the number of parallel workers or machines THEN a model SHALL show the total run time and how retries change it, labelled as a model.
- [ ] AC-017: WHEN the topic is shown THEN it SHALL explain traces, screenshots and videos on failure, retries and how to tell a flaky test from a real failure, and give a short example CI configuration for running the suite.

### P3: Notes and reading

- **Why P3:** Polish.

**Acceptance Criteria:**

- [ ] AC-018: WHEN a topic is shown THEN it SHALL end with a short "read more" (network mocking at the browser level, authentication state reuse, visual comparisons, accessibility checks inside end-to-end tests) and links to the sources it draws from.

## Edge Cases

- WHEN the latest run summary is missing or from an older version of the suite THEN the page SHALL show what it has and say when it was recorded, never invent results.
- WHEN a learner enters an invalid locator THEN the page SHALL show the error message instead of breaking.
- WHEN the learner runs a waiting strategy many times THEN the page SHALL stay responsive and let them stop the run.
- WHEN the site's pages change so that a suite test fails THEN the suite command SHALL exit with failure, and the recorded summary SHALL show the failure the next time it is recorded.

## Success Criteria

- [ ] The suite passes three runs in a row on a local machine with no retries needed.
- [ ] The page passes axe in light and dark themes, works at 360 px width without horizontal scroll, and every demo can be used with the keyboard.
- [ ] `pnpm typecheck`, `pnpm lint` and `pnpm build` pass, and the suite command passes.

## Open Questions

- None

## Notes

The subject of this page is a specific tool, so the spec names it. The suite tests this site's own practice pages, which already have controllable latency and failure rates; tests should set those controls instead of relying on chance.

## Baseline

### Current Behavior

- The repo has no automated tests of any kind; quality checks are type checking, linting and a production build.

### Gaps / Limitations

- Nothing checks that the practice demos still behave as their specs say after a change.
