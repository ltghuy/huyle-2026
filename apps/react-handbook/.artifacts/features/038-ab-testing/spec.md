---
id: "038"
feature: ab-testing
type: brownfield
scope: large
status: draft
branch: main
created: 2026-10-21
---

# Feature: Testing section, A/B testing

## Overview

The other Testing pages check that the code does what the team intended. An
A/B test checks whether what the team intended is any good: it shows
different versions to different visitors and measures which one moves a
metric. Frontend engineers build the parts that make or break an experiment:
assigning a visitor to a variant so it stays the same across visits, showing
the variant without a flash of the wrong one, logging exposure and
conversions, and keeping the variants testable. They are also asked, in
senior interviews, why "it looked better after two days" is not a result.

This feature writes the fourth Testing page. A real experiment runs on this
site: the server assigns each visitor to a variant, the choice sticks, and the
first page the visitor gets already shows their variant. A simulator in the
browser covers the statistics (sample size, significance, the cost of looking
at results early), which a single visitor's page cannot show for real. The
simulator is labelled as a simulation, and it uses real random draws and real
calculations.

## Goals

- [ ] A visitor is assigned to a variant by the server, keeps that variant across reloads, and sees it in the first render with no flash of the other variant.
- [ ] A learner can use the simulator to find, for a given baseline and effect, how many visitors an experiment needs, and see how checking early inflates false positives.
- [ ] Each of the five topics fits on about one screen of reading (plus a "read more") and has a demo whose result changes with the learner's input.

## Out of Scope

| Feature | Reason |
|---------|--------|
| A real analytics pipeline or stored experiment results across visitors | The site keeps no visitor data; conversions in the live demo are counted for the current visitor only, and the statistics come from the simulator |
| Third-party experimentation or feature flag services | The page explains the concepts and compares approaches without depending on a vendor |
| Bayesian and sequential testing in depth | Named in "read more" with what they solve |
| Multi-armed bandits | Named in "read more" only |
| Personalisation and targeting rules | Mentioned as a contrast to random assignment only |

## User Stories

### P1: Reach the page

- **Why P1:** Navigation.

**Acceptance Criteria:**

- [ ] AC-001: WHEN the page is written THEN the Testing section page, the sidebar and the home card SHALL list it (four of four pages written), and the strategy page SHALL link to it.

### P1: Anatomy of an experiment

- As a learner, I want to set up an experiment (hypothesis, variants, primary metric, guardrail metric, who is included), so that I know what has to be decided before any code is written.
- **Why P1:** Every later topic refers to these parts.
- **Independent Test:** Fill in the experiment form for the sample button and read the plan the page writes back, including what it warns about.

**Acceptance Criteria:**

- [ ] AC-002: WHEN the learner fills in an experiment plan (hypothesis, control and variant, primary metric, guardrail metric, unit of assignment, traffic share) THEN the page SHALL write it back as a one-paragraph plan and warn about common gaps (no guardrail, a metric the variant cannot move, assigning per page view when the metric is per visitor).

### P1: A real, sticky split

- As a learner, I want to be put into a real experiment on this site and see how my variant was chosen, so that I understand deterministic assignment and why it avoids flicker.
- **Why P1:** Assignment is the frontend's main job in an experiment.
- **Independent Test:** Open the page, note the variant, reload (same variant), reset the visitor id (variant may change), and see the server's reasoning each time.

**Acceptance Criteria:**

- [ ] AC-003: WHEN a visitor without an id opens the page THEN the server SHALL give them an anonymous id, assign a variant from the id and the experiment name, remember both in the browser, and the first render SHALL already show that variant.
- [ ] AC-004: WHEN the visitor reloads or comes back THEN they SHALL get the same variant; the page SHALL show the visitor id, the experiment name, the bucket number the assignment produced and the split that turned it into a variant.
- [ ] AC-005: WHEN the visitor resets their id or changes the traffic split THEN the page SHALL show the new assignment and explain why a changed split moves some visitors between variants and how to avoid that.
- [ ] AC-006: WHEN the visitor uses the sample variant (click the button the experiment changes) THEN the page SHALL count an exposure when the variant is shown and a conversion when it is used, for this visitor only, and show the events that would be sent.
- [ ] AC-007: WHEN the topic is shown THEN it SHALL compare assignment on the server, at the edge and in the browser, and show, in a sample frame, the flash of the wrong variant that browser-only assignment causes on first load next to a server-assigned one that has none.
- [ ] AC-008: WHEN the learner assigns many generated ids with the same method THEN the page SHALL show how evenly they spread across variants, so the learner sees the split is fair without any stored list of visitors.

### P1: Sample size and significance

- As a learner, I want to simulate an experiment with a baseline rate, a true effect and daily traffic, so that I see how many visitors a reliable answer needs.
- **Why P1:** Calling experiments too early is the most common mistake.
- **Independent Test:** Set a 5% baseline and a 10% relative lift, find the required sample size, and run the simulation to that size.

**Acceptance Criteria:**

- [ ] AC-009: WHEN the learner sets the baseline conversion rate, the minimum effect worth detecting, the significance level and the power THEN the page SHALL calculate the visitors needed per variant and the days it takes at the chosen traffic.
- [ ] AC-010: WHEN the learner runs a simulated experiment with a true effect they choose THEN the page SHALL draw random visitors and conversions, and show per variant the visitors, conversions, rate and confidence interval, the observed difference and its p-value, day by day.
- [ ] AC-011: WHEN the result is shown THEN the page SHALL say in plain words what it means and what it does not mean (a p-value is not the chance the variant is better).

### P1: Looking early

- As a learner, I want to see what happens when I check results every day and stop at the first significant one, so that I know why peeking is a problem.
- **Why P1:** A standard senior interview question with a counter-intuitive answer.
- **Independent Test:** Run 200 A/A experiments with daily peeking and see the false positive rate rise well above the chosen significance level.

**Acceptance Criteria:**

- [ ] AC-012: WHEN the learner runs a batch of A/A experiments (no true difference) with and without stopping at the first significant daily check THEN the page SHALL show the share that falsely declared a winner in each mode next to the chosen significance level.
- [ ] AC-013: WHEN the topic is shown THEN it SHALL explain the fixes (decide the sample size up front, or use a method designed for continuous monitoring) without requiring the learner to know the maths.

### P1: Pitfalls

- As a learner, I want to check an experiment for the problems that make results wrong, so that I can trust or reject a result.
- **Why P1:** A wrong result is worse than no result.
- **Independent Test:** Feed the checker a split that came out 52/48 on 20,000 visitors and see it flagged as a sample ratio mismatch.

**Acceptance Criteria:**

- [ ] AC-014: WHEN the learner enters the observed visitors per variant and the intended split THEN the page SHALL test for a sample ratio mismatch and, when it finds one, list the usual causes (a variant that crashes or loads slower, bots, redirects, assignment after a filter).
- [ ] AC-015: WHEN the topic is shown THEN it SHALL cover the novelty effect, testing many metrics at once, interactions between experiments, the performance cost of the variant code, and removing the losing variant after the decision.

### P2: Experiments and the test suite

- **Why P2:** Ties the section together, but the page works without it.

**Acceptance Criteria:**

- [ ] AC-016: WHEN the end-to-end suite from feature 036 runs THEN it SHALL include a test that forces each variant of the site's experiment and checks it renders, and the page SHALL quote it and explain why tests must pin variants instead of getting a random one.

### P3: Notes and reading

- **Why P3:** Polish.

**Acceptance Criteria:**

- [ ] AC-017: WHEN a topic is shown THEN it SHALL end with a short "read more" (sequential and Bayesian testing, bandits, feature flags versus experiments, holdouts) and links to the sources it draws from.

## Edge Cases

- WHEN the visitor's browser blocks cookies or storage THEN the page SHALL still show a variant, say that it cannot stay the same across visits, and explain why.
- WHEN the learner enters impossible inputs (a rate above 100%, zero traffic, an effect of zero for sample size) THEN the page SHALL explain the problem instead of showing a nonsense number.
- WHEN a simulation is large THEN the page SHALL stay responsive and let the learner stop it.
- WHEN the experiment name or split changes in a later release THEN visitors SHALL be reassigned predictably and the page SHALL say that this is the cause.

## Success Criteria

- [ ] Reloading the page ten times always shows the same variant, and the first paint already shows it.
- [ ] Ten thousand generated ids split within one percentage point of the intended split.
- [ ] A batch of A/A tests without peeking falsely declares a winner at about the chosen significance level; with daily peeking, clearly more often.
- [ ] The page passes axe in light and dark themes, works at 360 px width without horizontal scroll, and every demo can be used with the keyboard.
- [ ] `pnpm typecheck`, `pnpm lint` and `pnpm build` pass, and the suite command passes.

## Open Questions

- None

## Notes

The live experiment stores nothing about visitors on the server; the visitor's id and variant live in their own browser. Counts across visitors would need storage the site does not have, which is why the statistics topics use the simulator. Depends on feature 036 for AC-016 only.

## Baseline

### Current Behavior

- The site shows every visitor the same pages and remembers nothing about them apart from the theme choice.

### Gaps / Limitations

- There is no example of an experiment, so the frontend side of A/B testing is only described, never shown.
