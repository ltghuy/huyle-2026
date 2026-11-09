---
id: 037
feature: remove-sync-codes
type: brownfield
scope: medium
status: to-review
branch: main
created: 2026-11-09
---

# Feature: Remove sync codes

## Overview

Sync codes (feature 001, AC-047 to AC-051) were replaced by the Google account in feature 022, which kept a "Mã đồng bộ cũ" panel so learners could merge an old code into their account until 2026-11-11. The owner asked on 2026-11-09 to remove the feature now, two days before that date.

## Goals

- [ ] Nothing in the app or its API still reads, writes or mentions sync codes, while account progress sync works as before

## Out of Scope

| Feature | Reason |
|---------|--------|
| Dropping the `sync_profiles` table | Owner's choice: the table stays untouched in D1 for now, so old data can still be recovered |
| Account progress sync (`/api/progress`) | Unchanged; it shares the sync client, which keeps everything but the code paths |

## User Stories

### P1: No more sync codes

**Acceptance Criteria:**

- [x] AC-001: WHEN a learner opens Cài đặt THEN system SHALL not show "Mã đồng bộ cũ" or any way to enter a sync code
- [x] AC-002: WHEN anything calls `/api/sync` THEN system SHALL answer like any unknown route; the route, its service and the code helpers are gone, and so are `SYNC_CODES_UNTIL` and the `SYNC_LOOKUP_LIMITER` binding
- [x] AC-003: WHEN a signed-in learner's progress changes THEN system SHALL sync it through the account exactly as before (upload, conflict merge, pull, auto sync, keepalive on hide)
- [x] AC-004: WHEN a device still holds an old code link in its profile THEN system SHALL ignore it: no requests, never exported in a backup, and it no longer keeps the backup reminder away
- [x] AC-005: WHEN a learner reads the privacy page THEN system SHALL say old codes no longer work and their remaining data will be deleted from the server

## Edge Cases

- WHEN a device was linked to a code and not to an account THEN system SHALL keep its progress on the device only, with the backup reminder as for any unsynced device
- WHEN a backup is imported on such a device THEN system SHALL not carry the old code link over

## Success Criteria

- [ ] Lint, typecheck, unit tests and build pass with no reference to `/api/sync`; account sync tests cover conflicts, offline, pulls and auto sync

## Open Questions

- The privacy page says old code data "sẽ được xóa"; dropping `sync_profiles` (a migration, irreversible) is left for the owner to decide.

## Notes

Owner request 2026-11-09: remove all code paths now, keep the table.

## Baseline

### Current Behavior

- Cài đặt shows "Mã đồng bộ cũ": a field for an old code and "Gộp vào tài khoản". `/api/sync` serves codes until `SYNC_CODES_UNTIL`, then answers 410.

### Gaps / Limitations

- Dead weight two days before the cut-off; the owner wants it gone.
