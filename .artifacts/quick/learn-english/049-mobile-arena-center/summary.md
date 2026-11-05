---
slug: mobile-arena-center
completed: 2026-11-05
---

# Summary: Arena in the middle of the mobile bar

## What Changed

The phone bottom bar now reads Hôm nay · Từ vựng · Đấu trường · Ôn tập · Thêm. `MOBILE_PRIMARY` sets the bar's own order (before, the bar took the sidebar's order), and `MOBILE_CENTER` marks Arena as the middle tab. That tab is a 48px primary-coloured circle lifted 24px above the bar. A ring in the page background colour separates it from the bar's top border, and the label sits under it. "Bài tập" moved into the "Thêm" sheet, so the tour step for it points at "Thêm" on phones. Bar labels no longer wrap, because "Đấu trường" broke onto two lines at 320 px.

## Files Modified

| File | Change |
|------|--------|
| src/components/shell/nav.ts | new `MOBILE_PRIMARY` order, `MOBILE_CENTER` |
| src/components/shell/mobile-nav.tsx | bar follows `MOBILE_PRIMARY` order; raised center tab; `whitespace-nowrap` labels |

## Patterns Discovered

None.

## Follow-Up

None. Checked at 320, 360, 375, 390 and 400 px in headless Chrome: the bar fits in one line at each width. lint, typecheck, 1198 unit tests and the build pass.
