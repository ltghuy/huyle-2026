---
slug: all-tab-record
completed: 2026-11-15
---

# Summary: "Tất cả" record line counts team matches too

## What Changed

The "Tất cả" tab showed the Arena record, which counts 1-1 duels only, so lost team matches were missing ("5 thắng · 1 thua" with two team losses listed). `recordLine` now counts the listed matches on "Tất cả" (wins, losses, draws when there are any, then the number listed). "Đấu 1-1" keeps the Arena record and "Đấu đội" is unchanged. AC-053 in feature 039 was updated first.

## Files Modified

| File | Change |
|------|--------|
| apps/learn-english/src/components/arena/match-history.tsx | `recordLine` counts listed matches on "Tất cả" |
| apps/learn-english/src/components/arena/match-history.test.tsx | New expectations for the "Tất cả" and "Đấu 1-1" lines |
| .artifacts/features/learn-english/039-team-battle/spec.md | AC-053 reworded |

## Patterns Discovered

None

## Follow-Up

On "Tất cả" the counts cover only the 50 stored matches, so they can be lower than the lifetime 1-1 record shown on "Đấu 1-1". This is intended: the line says "trận gần nhất".
