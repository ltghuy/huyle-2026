---
slug: sidebar-credits-align
completed: 2026-10-28
---

# Summary: Align "Nguồn dữ liệu" in the sidebar

## What Changed

The footer link was plain text with its own padding, so it sat apart from the menu items' icon and label columns. It is now a `SidebarMenuButton` with the Info icon, smaller muted text, `isActive` on /credits and a tooltip. Every menu button size shares `p-2 gap-2`, so the icon and label land on the same columns as the items above (24 px and 48 px at desktop width, measured in the browser). In the collapsed sidebar it shows as a centered icon instead of being hidden.

## Files Modified

| File | Change |
|------|--------|
| `apps/learn-english/src/components/shell/app-sidebar.tsx` | Credits link as a menu row with the Info icon |

## Patterns Discovered

None.

## Follow-Up

None.
