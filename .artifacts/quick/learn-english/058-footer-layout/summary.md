---
slug: footer-layout
completed: 2026-11-08
---

# Summary: Balance the footer layout

## What Changed

The footer now has two rows. The top row has the app's name, with the same graduation cap as the sidebar, and one line about it ("Học tiếng Anh mỗi ngày cho người Việt… Miễn phí và không có quảng cáo.") on the left, and the donation card on the right. Under a divider, the bottom row keeps the copyright and the decree note on the left and the privacy and terms links on the right. On phones the parts stack, with the card at full width. Checked at 1440 px (light), 1024 px (dark) and 390 px with no horizontal scroll.

## Files Modified

| File | Change |
|------|--------|
| `apps/learn-english/src/components/shell/site-footer.tsx` | Two-row layout, name and description, shorter donation text |
| `.artifacts/features/learn-english/029-legal-pages/spec.md` | AC-006 describes the layout |

## Patterns Discovered

None.

## Follow-Up

None.
