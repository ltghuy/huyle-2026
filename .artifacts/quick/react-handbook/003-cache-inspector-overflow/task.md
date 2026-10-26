---
slug: cache-inspector-overflow
status: done
branch: main
created: 2026-10-07
---

# Quick Task: Stop the cache inspector from widening the page at phone width

## What

At 360 px the data-fetching practice page scrolls sideways (document 653 px wide) because the cache inspector's visually hidden "Actions" header label is absolutely positioned and escapes the table's scroll wrapper, which isn't a positioned element.

## Files

- `src/practices/data-fetching-hook/cache-inspector.tsx`: add `relative` to the table's `overflow-x-auto` wrapper so it contains the `sr-only` label

## Expected Outcome

- At 360 px the page is exactly the viewport width; the table still scrolls sideways inside its bordered box.
- No visual change at desktop widths; the "Actions" header still has its accessible name.

## Quality Gates

Run after the change, before marking done:

- `pnpm lint`
- `pnpm typecheck`
- `pnpm build`
- Manual: 360 px and 1280 px, page `scrollWidth` equals the viewport; axe shows no new issues
