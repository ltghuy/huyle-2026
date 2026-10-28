---
slug: two-way-sync-e2e
completed: 2026-10-28
---

# Summary: Prove two-way sync end to end

## What Changed

No app change was needed. Sync (feature 001, AC-047 to AC-051) is already two-way: a device uploads within a minute of a change, pulls the other devices' changes every minute while the page is visible and at once when the page comes back to the front, and merges both sides when they changed at the same time. After a pull, open screens refresh. The existing e2e only covered A to B twice, so a new test runs the owner's scenario both ways with "Đồng bộ ngay": A learns 3, B links (3), B learns 2 and A syncs (5), A learns 1 and B syncs (6). The e2e fixture has 7 A1 words, so the owner's 8 / 10 / 11 became 3 / 5 / 6. Both sync tests pass (run twice); a first run failed before reaching sync, while the fresh preview server was starting, and passed unchanged on rerun.

## Files Modified

| File | Change |
|------|--------|
| `apps/learn-english/e2e/specs/sync.spec.ts` | Two-way scenario test and small helpers |

## Patterns Discovered

None.

## Follow-Up

Automatic pulls stop after 30 minutes without activity on a device and resume when its page comes back to the front or the learner does something; "Đồng bộ ngay" in Cài đặt syncs at once.
