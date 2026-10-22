---
id: "047"
feature: ab-feature-flags
type: brownfield
scope: medium
status: done
branch: main
created: 2026-10-22
---

# Feature: A/B testing page, feature flags topic

## Overview

The A/B testing page explains experiments and mentions feature flags only in
a "read more" line. Most teams meet flags first, as the switch that lets them
deploy unfinished code, roll a change out to a few percent of users and turn
it off without a deploy. An experiment is one use of a flag, and the two get
confused: a gradual rollout is read as if it were a test, or a rollout and an
experiment share a hash and stop being random to each other. Flags that are
never removed pile up as untested code paths.

This feature adds a sixth topic to the A/B testing page on feature flags: the
kinds of flags and how long each should live, how a flag decides for each
visitor, how a rollout differs from an experiment, how to test code behind
flags, and removing flags. Its demo is a simulation; the site's own serving
doesn't change.

## Goals

- [x] The A/B testing page has a sixth topic on feature flags that fits on about one screen of reading (plus a "read more"), with a demo whose result changes with the learner's input.
- [x] Every claim in the topic traces to a named source (Pete Hodgson's "Feature Toggles", the OpenFeature specification, Google or the SEC where cited).

## Out of Scope

| Feature | Reason |
|---------|--------|
| A real flag system on this site | Decided with the user: the topic uses a simulation |
| Third-party flag services | Same as the rest of the page; OpenFeature is named as the vendor-neutral standard |
| A new end-to-end test | Nothing on the site changes behavior; the existing test that pins the experiment's variant is the example |

## User Stories

### P1: Feature flags topic

- As a learner, I want to see how flags roll a change out, switch it off, and differ from an experiment, so that I can use them without breaking my experiments or leaving debt.
- **Why P1:** It's the whole feature.
- **Independent Test:** Raise the rollout from 10% to 30% and see every visitor who had the change keep it; switch on "reuse the experiment's hash" and see the rollout land only in variant A.

**Acceptance Criteria:**

- [x] AC-001: WHEN the topic is shown THEN it SHALL explain that flags separate deploying from releasing; the four kinds of flags (release, experiment, ops including kill switches, permission) with how long each lives; that decisions belong in one place that takes the visitor's context (with the OpenFeature terms: evaluation context, targeting key, a default value when evaluation fails); percentage rollouts with a stable hash and a separate salt per flag; how a rollout differs from an experiment; which combinations to test; and removing flags, with an example of the cost of dead code.
- [x] AC-002: WHEN the learner sets a release flag's rollout percentage, turns on a staff-first rule, or turns the kill switch on THEN the demo SHALL show, for a fixed set of sample visitors, who gets the change and why (rule, rollout bucket, kill switch), and SHALL keep everyone who had the change when the percentage only goes up.
- [x] AC-003: WHEN the learner makes the rollout reuse the experiment's hash THEN the demo SHALL show how the rollout overlaps the experiment's variants (measured on 10,000 simulated visitors, since 100 are too few to show a split), compared with an independent hash, and say why that biases the experiment.
- [x] AC-004: WHEN the topic ends THEN it SHALL have the page's "read more" with links to its sources, and the page's existing "read more" line SHALL no longer list feature flags as a further topic.

### P2: Navigation within the page

- **Why P2:** The topic must be findable.

**Acceptance Criteria:**

- [x] AC-005: WHEN the page is shown THEN its table of contents SHALL list the sixth topic, and the page summary in the catalog SHALL mention feature flags.

## Edge Cases

- WHEN the rollout is 0% and no rule applies THEN the demo SHALL show nobody gets the change.
- WHEN the kill switch is on THEN it SHALL win over every rule and the rollout.
- WHEN the rollout is 100% THEN every visitor SHALL get the change, and the overlap with the experiment SHALL be the experiment's own split.

## Success Criteria

- [x] The page passes axe in light and dark themes (apart from the site-wide sidebar finding), works at 360 px without horizontal scroll, and the demo works with the keyboard.
- [x] `pnpm typecheck`, `pnpm lint`, `pnpm build` pass, and the existing A/B end-to-end test still passes.

## Open Questions

- None

## Notes

Sources: Pete Hodgson, "Feature Toggles (aka Feature Flags)", martinfowler.com
(2017); the OpenFeature specification (CNCF incubating project): flag
evaluation and evaluation context sections; SEC press release 2013-222 on
Knight Capital. Checked 2026-10-22.

## Baseline

### Current Behavior

- The A/B testing page has five topics. Feature flags appear in the last topic's "read more" line, and in the split topic as the request a browser waits for.

### Gaps / Limitations

- Nothing explains flags themselves, rollouts, or how a rollout and an experiment can interfere.
