---
slug: sidebar-credits-align
status: done
branch: feature/learn-english
created: 2026-10-28
---

# Quick Task: Align "Nguồn dữ liệu" in the sidebar

## What

Make the sidebar's "Nguồn dữ liệu" link a menu row with an icon, so it lines up with the menu items above it.

## Files

- `apps/learn-english/src/components/shell/app-sidebar.tsx`

## Expected Outcome

The footer link has the Info icon (as in the phone "Thêm" sheet), its icon and label start at the same x as the menu items' icons and labels, it is highlighted on /credits, and the collapsed sidebar shows it as an icon with a tooltip.

## Quality Gates

Run after the change, before marking done:

- `pnpm --filter learn-english lint`
- `pnpm --filter learn-english typecheck`
- `pnpm --filter learn-english test`
