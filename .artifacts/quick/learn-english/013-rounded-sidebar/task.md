---
slug: rounded-sidebar
status: done
branch: feature/learn-english
created: 2026-10-28
---

# Quick Task: Rounded, floating sidebar

## What

Show the desktop sidebar as a floating panel with rounded corners instead of a full-height strip against the screen edge.

## Files

- `src/components/shell/app-sidebar.tsx`: shadcn's `variant="floating"`, with the inner panel's corners raised to `rounded-2xl` to match the cards

## Expected Outcome

From `md` up, the sidebar sits 0.5rem from the screen edges, with rounded corners, a faint ring and a light shadow, expanded and collapsed to icons. The phone layout (bottom navigation) is unchanged. `src/components/ui/sidebar.tsx` stays as the CLI generated it.

## Quality Gates

Run after the change, before marking done:

- `pnpm --filter learn-english lint`
- `pnpm --filter learn-english typecheck`
- `pnpm --filter learn-english test`
- `pnpm --filter learn-english build`
