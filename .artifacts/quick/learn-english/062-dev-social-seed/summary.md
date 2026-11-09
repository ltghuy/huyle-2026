---
slug: dev-social-seed
completed: 2026-11-09
---

# Summary: Seed sample friends into the local D1

## What Changed

Local dev reads its own SQLite copy of D1, so friendships made in production never show up locally. Two SQL fixtures now add and remove four `dev-*` learners: three are befriended (mirrored rows) with every non-dev account in the local database, with one online, one seen 3 hours ago and one never seen, and the fourth has a pending request plus its bell notification. Times are computed relative to now in SQL, rows are upserted, and the scripts hard-code `--local`. Checked: seeding twice gives the same counts (6 friendships, 1 request, 1 notification), unseeding returns to the single real account, and reseeding works.

## Files Modified

| File | Change |
|------|--------|
| apps/learn-english/scripts/fixtures/dev-social.sql | New seed |
| apps/learn-english/scripts/fixtures/dev-social-clear.sql | New cleanup |
| apps/learn-english/package.json | `db:seed:social`, `db:unseed:social` |
| apps/learn-english/CLAUDE.md | How to see friends locally |

## Patterns Discovered

Local and remote D1 hold separate accounts and social data; see knowledge.md.

## Follow-Up

"An (dev)" only looks online for 150 s after seeding (nothing pulses for it); run the seed again to refresh.
