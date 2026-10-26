---
id: "034"
feature: page-dates
type: brownfield
scope: medium
status: done
branch: main
created: 2026-10-21
---

# Feature: Created and updated dates on practice and topic pages

## Overview

Every practice and topic page is now built or written, so the green "Built" and
"Written" badge in the page header says the same thing on every page. Readers
get more from knowing when a page was first published and when it last changed,
which tells them how current the notes are.

## Goals

- [x] Every practice and topic page header shows when the page last changed (its updated date, or its created date if it hasn't changed since), in place of the status badge.
- [x] The dates match the repository history at the time they were recorded.

## Out of Scope

| Feature | Reason |
|---------|--------|
| Dates on the home page section cards | They show a section's progress, not a single page |
| Working the dates out from git at build time | Some deploy targets build without the git history, so the dates are stored with the page list instead |
| Time of day or relative dates ("3 days ago") | A calendar date is enough, and a relative date would go stale on prerendered pages |

## User Stories

### P1: See how current a page is

- As a reader, I want to see when a page was created and last updated so that I can judge how current its notes are.
- **Why P1:** It is the whole request.
- **Independent Test:** Open any practice and any topic page and read the dates under the breadcrumbs.

**Acceptance Criteria:**

- [x] AC-001: WHEN the user opens a built practice page THEN system SHALL show the practice number followed by the page's date (see AC-004) where the "Built" badge was.
- [x] AC-002: WHEN the user opens a written topic page THEN system SHALL show the page's date (see AC-004) where the "Written" badge was.
- [x] AC-003: WHEN a date is shown THEN system SHALL format it as a calendar date (for example "Oct 8, 2026") inside a `time` element whose machine-readable value is the ISO date, so the same date renders on server and client.
- [x] AC-004: WHEN a page was updated after the day it was created THEN system SHALL show only the updated date ("Updated Oct 13, 2026"); WHEN it was not THEN system SHALL show only the created date ("Created Oct 8, 2026"). *(Changed 2026-10-21 at the user's request: showing both was redundant.)*
- [x] AC-005: WHEN the user opens the React Practices index or a topic section index THEN each built or written card SHALL show the page's date (see AC-003 and AC-004) as a green badge where the "Built" or "Written" badge was. *(Added 2026-10-25, quick task 025-card-date-badges: the cards had kept their status badge.)*

## Edge Cases

- WHEN a practice or topic page is not built or written yet THEN system SHALL keep showing the "Coming soon" badge instead of dates, in the page header and on its card.
- WHEN dates are rendered THEN system SHALL use UTC, so a reader in any time zone sees the stored date.

## Success Criteria

- [x] All 14 practice pages and 17 topic pages show dates, checked in a browser on at least one page of each kind.
- [x] `pnpm typecheck && pnpm lint && pnpm build` pass.

## Open Questions

- None

## Notes

Seed values come from git: the created date is the first commit that added the page's route, and the updated date is the latest commit that touched the route or the page's own content files. After that, a change to a page's content bumps its updated date in the same change.

## Baseline

### Current Behavior

- Practice pages show the practice number and a green "Built" badge above the title.
- Topic pages show a green "Written" badge above the title.

### Gaps / Limitations

- The badge is the same on every page, so it gives the reader nothing new.
