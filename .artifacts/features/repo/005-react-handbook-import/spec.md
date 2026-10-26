---
id: 005
feature: react-handbook-import
type: brownfield
scope: complex
status: in-progress
branch: main
created: 2026-10-26
---

# Feature: React Handbook Import

## Overview

The owner keeps a second site, the React handbook (live at the learning subdomain), in its own repository. The monorepo set up in feature 004 was built for exactly this: a second app beside the portfolio, sharing configuration and root commands. This feature brings the handbook in as its own app, with its history, its specs and its agent guidance, without changing what visitors of either site see and without breaking either site's deploys. Both projects carry their own spec, knowledge and agent-rule folders with overlapping numbering, so these have to be merged into one coherent set.

## Goals

- [ ] The handbook site serves the same pages, redirects and headers to visitors before and after the move, from its existing deploy target and domain.
- [ ] The portfolio site is unaffected: same pages, same deploys, and it does not rebuild for handbook-only changes.
- [ ] One repository holds both apps' history, specs, knowledge and agent rules, with no lost or conflicting entries.

## Out of Scope

| Feature | Reason |
|---------|--------|
| Changing handbook content, design or behavior | Structural move only |
| Aligning dependency versions between the apps | Tentative decision: separate change |
| Extracting shared UI or code between the apps | No shared code needed yet |
| Archiving or deleting the old handbook repository | Owner's call after the move |
| Keeping the Railway deploy path | Dropped by decision |

## User Stories

### P1: Handbook runs as an app in this repository

- As the owner, I want the handbook to live as its own app here, built and tested from the root, so that both sites share one workspace.
- **Why P1:** Everything else depends on the code being here and working.
- **Independent Test:** From a fresh clone, install once at the root; build, lint, type-check and run the handbook's end-to-end suites from the root; serve the handbook locally and see the same home page as the live site.

**Acceptance Criteria:**

- [ ] AC-001: WHEN dependencies are installed once at the root THEN system SHALL install both apps from one frozen lockfile.
- [ ] AC-002: WHEN the root build, lint and type-check commands run THEN system SHALL run them for both apps and pass.
- [ ] AC-003: WHEN the root end-to-end command runs THEN system SHALL run both apps' suites (including the handbook's scenario-based tests) and pass, without the two apps' servers colliding.
- [ ] AC-004: WHEN the root develop command runs THEN system SHALL start both sites at distinct local addresses.
- [ ] AC-005: WHEN the handbook is built THEN system SHALL produce the same set of routes, redirects and response headers as before the move.
- [ ] AC-006: WHEN a commit or file history of a handbook file is viewed THEN system SHALL show its history from the old repository.

### P1: Both sites keep deploying

- As the owner, I want the handbook to deploy from this repository to its existing target, and the portfolio to keep deploying unchanged, so that neither site goes down.
- **Why P1:** A broken deploy is an outage on a live domain.
- **Independent Test:** Push a handbook-only change: only the handbook rebuilds and deploys; push a portfolio-only change: only the portfolio does; both live sites respond as before.

**Acceptance Criteria:**

- [ ] AC-007: WHEN the handbook is previewed locally from the root THEN system SHALL serve its pages in the edge runtime.
- [ ] AC-008: WHEN a change touching only the handbook is pushed THEN only the handbook's automatic deploy SHALL run, and it SHALL publish to the existing handbook target and domain.
- [ ] AC-009: WHEN a change touching only the portfolio is pushed THEN only the portfolio's automatic deploy SHALL run.
- [ ] AC-010: WHEN shared configuration or root workspace files change THEN both automatic deploys SHALL run.
- [ ] AC-011: WHEN either app is deployed manually from the root THEN system SHALL deploy that app only, by a documented name that cannot collide with package-manager built-ins.

### P2: Specs, knowledge and agent rules merged

- As the owner (and the agents working here), I want one set of spec folders, one knowledge base and one rule set that knows which app each item belongs to, so that nothing is lost and guidance never leaks between apps.
- **Why P2:** The code works without it, but agents would follow wrong or conflicting guidance.

**Acceptance Criteria:**

- [ ] AC-012: WHEN the specs folder is browsed THEN every existing feature and quick task from both repositories SHALL be present, grouped by app (with a cross-app group), keeping its original number.
- [ ] AC-013: WHEN a new spec is created THEN the project instructions SHALL say which group it goes in and how its number is chosen.
- [ ] AC-014: WHEN the knowledge base is read THEN it SHALL contain every decision, gotcha and feedback entry from both repositories, each marked with the app it applies to.
- [ ] AC-015: WHEN an agent edits a file in one app THEN only that app's rules SHALL be loaded for it (the handbook's six rules never apply to the portfolio, the portfolio's locale rule never applies to the handbook).
- [ ] AC-016: WHEN the project instructions are read THEN they SHALL describe both apps, their commands and the required skills of each.

### P3: Clean hand-off

- As the owner, I want the old repository's leftovers (Railway config, root-level helper files) cleaned up and the move documented so the old repo can be archived.
- **Why P3:** Housekeeping.

**Acceptance Criteria:**

- [ ] AC-017: WHEN the move is done THEN the Railway deploy config SHALL be gone and the readme SHALL describe both apps and both deploys.

## Edge Cases

- WHEN both apps define the same local environment variable name THEN each app SHALL read only its own environment file.
- WHEN both apps' dev servers or test servers start together THEN they SHALL use different ports.
- WHEN the handbook's generated test files or build outputs exist THEN lint and git SHALL ignore them at their new location.
- WHEN a dependency with an install script is new to this workspace THEN install SHALL require its explicit approval (existing allow-list policy).
- WHEN the handbook Worker's automatic deploy is switched over before the import lands THEN it SHALL fail visibly rather than publish a broken site (live site keeps the last good version).

## Success Criteria

- [ ] All root gates pass for both apps: frozen install, lint, type-check, portfolio 22/22 unit + 8/8 e2e, handbook e2e (specs + scenarios) at its pre-move pass count, both builds, both edge previews.
- [ ] Production: both domains serve the same home page title and 200 on their probe routes after the move.
- [ ] A handbook-only push produces exactly one Workers Builds run (handbook); a portfolio-only push produces exactly one (portfolio).
- [ ] Counts match: 48 handbook features, 26 handbook quick tasks, the portfolio's specs and quick tasks, and every knowledge entry from both repos are present after the merge.

## Open Questions

- ~~Which frontmatter key does Claude Code honor for path-scoped rules?~~ Resolved in design: `paths` is the only field read; the portfolio rule's `appliesTo` is ignored today.
- Is the handbook Worker's Workers Builds currently connected to the old repository? (Owner to check; affects rollout order.)

## Notes

- Evidence: owner request to bring the handbook in as a separate app and merge the duplicate agent folders.
- Lesson carried from 004: verify Workers Builds by the command line in the build log, not only the status badge.

## Baseline

### Current Behavior

- The handbook lives in its own repository with 83 commits, deploys to its own Worker on the learning subdomain, and also carries an unused Railway config.
- It has 48 feature specs, 26 quick tasks, a research cache, a baseline, a knowledge base and six agent rules that apply to all its code.
- Its tests are spec-style and scenario-style end-to-end suites served on a non-default port; it has no unit tests.
- The portfolio repository is a monorepo with one app, shared config packages, and two features plus two quick tasks numbered from 001.

### Gaps / Limitations

- Two repositories for two sites that share tooling and conventions.
- Overlapping spec numbers and duplicate knowledge/rule folders that can't be copied side by side.
- The handbook's rules would govern the portfolio if copied unscoped.
