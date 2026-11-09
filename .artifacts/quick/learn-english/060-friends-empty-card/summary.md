---
slug: friends-empty-card
completed: 2026-11-09
---

# Summary: Friends empty state as a card, without the Arena link

## What Changed

The friends list's empty state is now a small dashed card (icon, "Bạn chưa có bạn bè nào." and the Arena hint) with no "Vào Đấu trường" link, since a "Bạn bè" sidebar item will be added later. The card uses `self-start`, so it no longer stretches over the sidebar's `minmax(0,1fr)` row, which had spread the old lines far apart. AC-016 of feature 031 was reworded to match.

## Files Modified

| File | Change |
|------|--------|
| apps/learn-english/src/components/social/friends-list.tsx | Empty card replaces text plus link; `next/link` import removed |
| apps/learn-english/src/components/social/friends-list.test.tsx | AC-016 test checks the card and that no link renders |
| .artifacts/features/learn-english/031-arena-friends/spec.md | AC-016 wording |

## Patterns Discovered

None.

## Follow-Up

The "Bạn bè" sidebar item is a separate change.
