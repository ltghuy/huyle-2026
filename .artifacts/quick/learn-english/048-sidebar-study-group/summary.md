---
slug: sidebar-study-group
completed: 2026-11-05
---

# Summary: Group the study pages in the sidebar

## What Changed

The desktop sidebar now has one "Thư viện" row in place of "Từ vựng", "Ngữ pháp" and "Động từ bất quy tắc". The row uses a shadcn Collapsible (Base UI) and its three pages sit in a sub-list below it. The group starts closed. It opens when the current page is one of the three, and the learner can still close it there. While closed, the row shows the active highlight for the page inside. When the sidebar is collapsed to icons, the three items show as plain icons as before, since the sub-list has no room there. The first-visit tour points a step at the "Thư viện" row (`data-tour-fallback`) when that step's item is hidden in the closed group. The mobile bar and the "Thêm" sheet are unchanged.

## Files Modified

| File | Change |
|------|--------|
| src/components/shell/nav.ts | `LIBRARY_GROUP` (label, icon, member hrefs) |
| src/components/shell/app-sidebar.tsx | `NavButton` and `LibraryGroup`; flat items in icon mode |
| src/components/tour/tour-steps.ts | `findTarget` falls back to `[data-tour-fallback~=target]` before "Thêm" |
| src/components/ui/collapsible.tsx | added with `shadcn add collapsible` |

## Patterns Discovered

None.

## Follow-Up

None. Checked in the browser at /grammar: the group opens on its own, closes on click, keeps the highlight when closed, and icon mode lists all items. lint, typecheck, 1198 unit tests and the build pass.
