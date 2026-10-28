---
slug: toggle-in-sidebar
completed: 2026-10-28
---

# Summary: Sidebar toggle inside the sidebar

## What Changed

`SidebarTrigger` moved from `PageHeader` into `AppSidebar`'s header. The header is a row: the home link (logo and name) takes the free space and the toggle sits at the end. In the collapsed (icon) sidebar the header turns into a column, so the toggle shows under the logo. The label follows the sidebar state ("Thu gọn thanh bên" when expanded, "Mở rộng thanh bên" when collapsed) and is also the tooltip, replacing the old "Thu gọn hoặc mở thanh bên". Checked at 1280px: expanded, the toggle is at the right of the name (x 212 to 240); collapsed, it is under the logo (y 56); no toggle is left in the page.

## Files Modified

| File | Change |
|------|--------|
| `apps/learn-english/src/components/shell/app-sidebar.tsx` | Toggle in the sidebar header, state-aware label |
| `apps/learn-english/src/components/shell/page-header.tsx` | Toggle removed |

## Patterns Discovered

None.

## Follow-Up

None.
