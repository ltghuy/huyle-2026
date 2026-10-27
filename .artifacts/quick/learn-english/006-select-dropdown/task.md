---
slug: select-dropdown
status: done
branch: feature/learn-english
created: 2026-10-27
---

# Quick Task: Select dropdowns open below their box

## What

The level select in Settings and the topic and type filters in /exercises opened on top of their own box with no inner padding; make them open below it, at its width, with padded options.

## Files

- `src/components/settings/level-setting.tsx`
- `src/components/library/exercise-library.tsx`

## Expected Outcome

Each dropdown opens 4 px under its box, left-aligned and the same width, so the box stays visible. Options sit inside a 4 px padding, so the highlight doesn't touch the edges, and every option is at least 40 px tall. The level box is 44 px tall like the filters (its `h-11` lost to the generated `data-[size=default]:h-8`).

## Quality Gates

Run after the change, before marking done:

- `pnpm --filter learn-english lint`
- `pnpm --filter learn-english typecheck`
- `pnpm --filter learn-english test`
