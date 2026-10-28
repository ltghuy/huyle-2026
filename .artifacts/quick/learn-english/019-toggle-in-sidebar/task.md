---
slug: toggle-in-sidebar
status: done
branch: feature/learn-english
created: 2026-10-28
---

# Quick Task: Sidebar toggle inside the sidebar

## What

Move the button that collapses the sidebar from the page header into the sidebar, at the right of "English with Evan".

## Files

- `apps/learn-english/src/components/shell/app-sidebar.tsx`
- `apps/learn-english/src/components/shell/page-header.tsx`

## Expected Outcome

The expanded sidebar shows the logo and name on the left and the toggle on the right of its header row. Collapsed to icons, the toggle sits under the logo so the sidebar can still be expanded. Page titles start at the left edge without the toggle beside them. The button's label says what it will do: "Thu gọn thanh bên" or "Mở rộng thanh bên".

## Quality Gates

Run after the change, before marking done:

- `pnpm --filter learn-english lint`
- `pnpm --filter learn-english typecheck`
- `pnpm --filter learn-english test`
