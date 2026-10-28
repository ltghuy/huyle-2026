---
slug: rounded-sidebar
completed: 2026-10-28
---

# Summary: Rounded, floating sidebar

## What Changed

`AppSidebar` uses shadcn's `variant="floating"`: from `md` up the sidebar is a panel 0.5rem off the screen edges with a faint ring and a light shadow, expanded and collapsed to icons. The inner panel's corners are raised from the generated `rounded-lg` to `rounded-2xl` with a class on our component (`[&_[data-slot=sidebar-inner]]:rounded-2xl`), so `src/components/ui/sidebar.tsx` is unchanged. Checked in the browser at 1280px in dark mode, expanded and collapsed.

## Files Modified

| File | Change |
|------|--------|
| `src/components/shell/app-sidebar.tsx` | `variant="floating"`, `rounded-2xl` inner panel |

## Patterns Discovered

None.

## Follow-Up

None. Phones use the bottom navigation and are unchanged.
