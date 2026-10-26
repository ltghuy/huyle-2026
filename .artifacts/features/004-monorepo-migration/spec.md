---
id: 004
feature: monorepo-migration
type: brownfield
scope: large
status: in-progress
branch: main
created: 2026-10-26
---

# Feature: Monorepo Migration

## Overview

The repository holds exactly one website, laid out as a single project. The owner plans to add a second app later and wants the repository restructured now so that app can be dropped in beside the site, sharing configuration and running through one set of root commands, instead of reworking the layout under the pressure of a new project. The site itself must not change for visitors, and both ways it gets deployed today (automatic deploy from the hosted repository, and a manual deploy from the developer machine) must keep working.

## Goals

- [ ] The live site is identical for visitors before and after the move (same pages, same metadata endpoints, same deploy target).
- [ ] Every developer workflow that works today (develop, build, lint, type-check, unit tests, end-to-end tests, local preview, deploy) works from the repository root after the move.
- [ ] Adding a second app requires only creating it in the apps area and reusing the shared configuration; no change to existing app code or root tooling beyond registering it.

## Out of Scope

| Feature | Reason |
|---------|--------|
| Creating the second app | Owner will create it later |
| Extracting UI components, translations or content into shared libraries | No second consumer yet; would churn every import for no gain |
| Visual, copy or behavior changes to the site | This is a structural move only |
| Continuous-integration pipeline | None exists today; separate decision |
| Shared remote build cache | Local cache is enough for one app (tentative, see decisions) |

## User Stories

### P1: Site lives as an app inside a workspace

- As the site owner, I want the existing site moved into the repository's apps area and run through root commands so that the layout is ready for more apps without changing the site.
- **Why P1:** Everything else depends on the move; on its own it already delivers the new layout.
- **Independent Test:** From a fresh clone, install once at the root, then develop, build, lint, type-check, run unit and end-to-end tests from the root; all succeed and the home page renders as before.

**Acceptance Criteria:**

- [x] AC-001: WHEN dependencies are installed once at the repository root THEN system SHALL install every workspace member from a single frozen lockfile with no extra steps.
- [x] AC-002: WHEN the developer runs the root develop command THEN system SHALL start the site locally at the same address as today with live reload.
- [x] AC-003: WHEN the developer runs the root build, lint, type-check and unit-test commands THEN system SHALL run them for every workspace member and pass for the site.
- [x] AC-004: WHEN the developer runs the root end-to-end command THEN system SHALL start the site and pass the existing end-to-end suite unchanged.
- [x] AC-005: WHEN the site is built THEN system SHALL produce the same routes as before (home, not-found, icons, social images, robots, sitemap), all prerendered static.
- [x] AC-006: WHEN a task's inputs are unchanged since its last successful run THEN system SHALL reuse the cached result instead of running it again.
- [x] AC-007: WHEN file history is viewed for a moved source file THEN system SHALL show its history from before the move.

### P1: Both deploy paths keep working

- As the site owner, I want both the automatic deploy and my manual deploy to publish the site exactly as before so that the move never takes the site down.
- **Why P1:** A move that breaks deploys is a production outage.
- **Independent Test:** Run the local preview and the manual deploy from the root; push to the main line and watch the automatic deploy succeed; the live pages respond as before.

**Acceptance Criteria:**

- [x] AC-008: WHEN the developer runs the local preview from the root THEN system SHALL build for the edge host and serve the home page, robots, sitemap and social image successfully.
- [ ] AC-009: WHEN the developer runs the manual deploy from the root THEN system SHALL publish to the same deploy target as today.
- [ ] AC-010: WHEN the developer runs the deploy by its documented name THEN system SHALL deploy the site, never trigger the package manager's own unrelated built-in command.
- [ ] AC-011: WHEN a change is pushed to the main line THEN the automatic deploy SHALL build and publish the site once the owner has applied the documented hosting-setting change.

### P2: Shared configuration ready for the next app

- As the site owner, I want type-checking and lint rules defined once and consumed by the site so that the next app starts from the same standards.
- **Why P2:** Pays off only when the second app arrives, but is cheap now and avoids copy-paste later.

**Acceptance Criteria:**

- [x] AC-012: WHEN the site's type-check and lint run THEN system SHALL apply rules inherited from the shared configuration, with results identical to today's.
- [x] AC-013: WHEN a new app is added to the apps area THEN system SHALL pick it up in root build, lint, type-check and test runs without editing the root task definitions.

### P3: Project docs and agent rules match the new layout

- As the site owner (and the AI agents working in the repo), I want the readme, project context and agent rules to describe the new layout so that nobody follows stale paths.
- **Why P3:** Doesn't affect the running site, but stale rules cause wrong edits.

**Acceptance Criteria:**

- [x] AC-014: WHEN the readme, project instructions, project context and locale rule are read THEN they SHALL reference the new locations and root commands, with no paths that no longer exist.
- [x] AC-015: WHEN the site's dev server regenerates its agent notice THEN the repository SHALL stay clean (the regenerated file is committed in its expected place).

## Edge Cases

- WHEN a workspace member imports a package it does not declare THEN system SHALL fail install-time or build-time rather than resolve it implicitly.
- WHEN styling classes are used only in a future shared package THEN the site build SHALL still include them (the scanning scope must cover shared packages once they exist).
- WHEN the edge-host build runs from the root THEN it SHALL find the site's build output and hosting config without manual path arguments.
- WHEN a dependency with an install script is added to any member THEN system SHALL surface the approval requirement instead of silently skipping it.
- WHEN generated build output exists (site build, edge build, local edge runtime state) THEN lint SHALL ignore it and git SHALL not track it, at any depth.
- WHEN the automatic deploy runs before the owner updates the hosting settings THEN it SHALL fail visibly rather than publish a broken site.

## Success Criteria

- [ ] All gates that passed after the pnpm switch pass after the move: frozen install, lint, type-check, 22/22 unit, 8/8 end-to-end, build, edge build + preview with the four probe routes returning 200.
- [ ] A production deploy after the move serves the same home page title and the same four probe routes with 200.
- [ ] A second run of the root build with no changes completes from cache.
- [ ] Zero stale paths in current docs and agent rules (historical artifacts excepted).

## Verification Status

- **Pending a real deploy (needs owner approval to push/deploy):** AC-009 (manual `cf:deploy` from the root was not run, as it deploys production), AC-010 (names verified non-colliding; deploy not executed by those names yet), AC-011 (B1 `b4bcb5e` pushed and the live site is healthy, but the Workers Builds run for it is not confirmed; B2/B3 are not pushed yet).
- Everything else was verified locally on 2026-10-26 (see tasks.md).

## Open Questions

- Exact name for the non-colliding deploy command (resolve in design).
- Whether the automatic deploy's hosting settings will be changed before or right after the move lands on the main line (the owner pushes straight to it; see decisions).

## Notes

- Evidence: owner request ("switch this project to mono-repo"), with a second app planned but not yet defined.
- The package-manager switch landed separately on 2026-10-26 so any breakage from this move points at the layout change alone.
- The owner pushes straight to the main line, and that triggers the automatic deploy; the rollout must be ordered so production is never broken.

## Baseline

### Current Behavior

- One site at the repository root; all commands (develop, build, lint, unit tests, end-to-end tests, preview, deploy) run from the root.
- Unit tests 22/22 and end-to-end 8/8 pass; production build prerenders 8 static routes.
- Deploys go to the edge host both automatically from the hosted repository and manually from the developer machine, under one deploy target name.
- Agent instructions and the locale rule reference source locations at the root.

### Gaps / Limitations

- No place to add a second app without restructuring.
- Configuration (types, lint) is single-app; a new app would copy it.
- The manual deploy command, as named today, is intercepted by the package manager's built-in command of the same name.
