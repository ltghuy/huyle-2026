---
id: "035"
feature: testing-section
type: brownfield
scope: large
status: done
branch: main
created: 2026-10-21
---

# Feature: Testing section, Testing strategy

## Overview

The handbook explains how to build, ship and secure a frontend, but not how to
know it still works. Testing questions come up in every senior frontend
interview: which tests to write, how many of each, what to mock, why the
end-to-end suite is slow and flaky, and how a product team can read the tests.
Most learners have written unit tests without a model of what each level of
test is good for.

This feature opens a new Testing section with four pages and writes the first
one, Testing strategy. Later features add End-to-end testing with Playwright
and the Page Object Model (036), Behaviour-driven tests with Cucumber (037)
and A/B testing (038). Testing strategy gives the shared vocabulary the other
pages use: the levels of test, the shapes a suite can take, how to choose a
level for a case, test doubles, and where tests run. It follows the other
topic pages: short topics, each with a demo whose result changes with the
learner's input, and simplified models labelled as such.

## Goals

- [x] The Testing section and the strategy page can each be reached in one click from the sidebar and the home page, and the section page lists all four planned pages, with the unwritten ones marked as coming soon.
- [x] Each of the five topics fits on about one screen of reading (plus a "read more") and has a demo whose result changes with the learner's input.
- [x] A learner can classify a list of real cases from this site into a test level and get the reasoning for each, so the page ends with a decision they can reuse.

## Out of Scope

| Feature | Reason |
|---------|--------|
| Writing and running end-to-end tests | Feature 036 covers it with a real suite |
| Gherkin feature files and step definitions | Feature 037 |
| Experiments and A/B tests | Feature 038 |
| A unit or component test suite for this repo | The strategy page explains those levels; adding a second test runner is a separate decision |
| Visual regression, load and contract testing in depth | Named in the levels topic with a sentence each; their own pages later if needed |
| Code coverage tooling | Coverage is discussed as a metric, without wiring up a tool |

## User Stories

### P1: Reach the section and the page

- As a learner, I want a Testing section with its pages listed so that I can find testing topics in one place.
- **Why P1:** Without a route and navigation nothing else can be seen.
- **Independent Test:** From the home page, open Testing, then Testing strategy; breadcrumbs lead back.

**Acceptance Criteria:**

- [x] AC-001: WHEN the home page is shown THEN the Testing section SHALL appear as a card with a summary and its progress (pages written out of four), linking to the section page.
- [x] AC-002: WHEN the sidebar is shown THEN it SHALL have a Testing folder listing all four pages; the section page SHALL list them with their summaries, the unwritten ones marked as coming soon; opening an unwritten page SHALL show a short "being written" note that links back to the section.
- [x] AC-003: WHEN the strategy page opens THEN it SHALL show breadcrumbs (Handbook, Testing, page), its date, title, intro and a topic list linking to its five topics.

### P1: Why test, and what a test buys

- As a learner, I want to see what a test protects against and what it costs, so that I write tests for confidence rather than for a number.
- **Why P1:** Every later topic weighs confidence against cost.
- **Independent Test:** Introduce a bug into the sample function and watch which of the listed tests catch it.

**Acceptance Criteria:**

- [x] AC-004: WHEN the learner picks a change to a small sample feature (a price formatter and the cart total that uses it) from a list of bugs and harmless refactors THEN the page SHALL run a set of tests written three ways (against implementation details, against behaviour, and none) against the changed code in the browser and show which tests fail.
- [x] AC-005: WHEN a harmless refactor breaks tests written against implementation details THEN the page SHALL point out the false alarm; WHEN a real bug passes them THEN it SHALL point out the missed bug, and say that behaviour-level tests caught one and ignored the other.

### P1: Levels and shapes of a suite

- As a learner, I want to compare static checks, unit, integration and end-to-end tests on speed, cost and confidence, and see the pyramid and trophy shapes, so that I can argue for a mix.
- **Why P1:** "Pyramid or trophy?" is a standard interview question, and the rest of the section depends on these terms.
- **Independent Test:** Change the mix of tests and see run time, maintenance and the share of sample bugs caught update.

**Acceptance Criteria:**

- [x] AC-006: WHEN the topic is shown THEN it SHALL describe each level (static checks, unit, integration, end to end) with what it runs, what it fakes, what it catches and what it misses, and name visual, contract and load tests in one line each.
- [x] AC-007: WHEN the learner sets how many tests of each level a suite has, or picks a preset (pyramid, trophy, ice-cream cone) THEN a model SHALL show the suite's run time, flake rate, maintenance cost and which of a fixed list of sample bugs it would catch, labelled as a simplified model with its assumptions shown.

### P1: Choose the level for a case

- As a learner, I want to sort real cases from this site into the level I would test them at and compare with a recommended answer, so that I practise the decision.
- **Why P1:** This is the reusable skill the page promises.
- **Independent Test:** Place "the debounced search drops a stale response" at a level and read the recommendation and its reasoning.

**Acceptance Criteria:**

- [x] AC-008: WHEN the learner places each case (drawn from this site's practices, for example a price format, a reducer, the multi-step form's validation, the debounced search's stale responses, the checkout flow across pages, the token refresh) at a level THEN the page SHALL show the recommended level, the reason, and what a test at the learner's level would miss or cost; more than one level MAY be accepted when the reason says why.
- [x] AC-009: WHEN the learner has placed every case THEN the page SHALL show a summary of agreements and differences, and the questions behind the recommendation (does it cross a process or network boundary, is it pure logic, does the user see it, how costly is a miss).

### P1: Test doubles and what to mock

- As a learner, I want to see the difference between a stub, a mock, a spy and a fake, and what goes wrong when I mock too much, so that I mock at the right boundary.
- **Why P1:** Over-mocking is the most common reason tests pass while the app is broken.
- **Independent Test:** Mock the network for the sample search, break the real response shape, and see the mocked test still pass while the test with a fake server fails.

**Acceptance Criteria:**

- [x] AC-010: WHEN the topic is shown THEN it SHALL define stub, mock, spy and fake with a one-line example each, using the sample search feature.
- [x] AC-011: WHEN the learner chooses where to cut (mock the fetch function, fake the network at the request level, or call a real local server) and then changes the server's response shape THEN the page SHALL run the sample test for each choice in the browser and show which still pass, naming the one that hides the break.

### P2: Where tests run

- As a learner, I want to see which tests run on save, on commit, in CI and after deploy, so that I can design a feedback loop that stays fast.
- **Why P2:** Useful for senior answers, but the page works without it.

**Acceptance Criteria:**

- [x] AC-012: WHEN the learner moves each kind of check between stages (editor, pre-commit, pull request, main branch, after deploy) THEN the page SHALL show the time to first feedback for a typical change, what reaches production unchecked, and warn when a slow suite blocks every commit; labelled as a model.

### P3: Notes and reading

- **Why P3:** Polish.

**Acceptance Criteria:**

- [x] AC-013: WHEN a topic is shown THEN it SHALL end with a short "read more" holding the senior-level points (coverage as a signal not a target, flake budgets, testing the contract between teams) and links to the sources it draws from.

## Edge Cases

- WHEN the learner sets every level to zero in the shape model THEN it SHALL show that nothing is caught instead of dividing by zero.
- WHEN a demo runs sample tests in the browser and a test throws THEN the page SHALL show it as a failing test with its message, never break the page.
- WHEN the learner skips cases in the classification exercise THEN the summary SHALL count only the placed ones and say how many are left.
- WHEN a later Testing page is not written yet THEN links to it from this page SHALL lead to its "being written" note.

## Success Criteria

- [x] Every sample bug in AC-004 is caught by the behaviour-level tests, and every harmless refactor passes them.
- [x] The page passes axe in light and dark themes, works at 360 px width without horizontal scroll, and every demo can be used with the keyboard.
- [x] `pnpm typecheck`, `pnpm lint` and `pnpm build` pass.

## Open Questions

- None

## Notes

The sample tests in AC-004 and AC-011 run in the reader's browser against small sample code shown on the page. They are real runs of real assertions, kept small so they finish instantly. The shape and pipeline models (AC-007, AC-012) are models and are labelled with their assumptions.

## Baseline

### Current Behavior

- The handbook has six sections: React Practices, Browser & Web Platform, Performance & Accessibility, Security, Frontend System Design and Under the Hood.
- Testing is not covered anywhere, apart from passing mentions in practice guides.

### Gaps / Limitations

- A learner has nowhere to learn how to choose, write and run tests for the features the handbook builds.
