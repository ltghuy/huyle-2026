---
slug: sidebar-resize
status: done
branch: main
created: 2026-11-09
---

# Quick Task: Drag the sidebar's edge to resize it

## What

On desktop, the learner can drag the right edge of the expanded sidebar to make it wider, from the default 16rem (256px) up to 300px.

## Files

- apps/learn-english/src/components/shell/sidebar-resize-handle.tsx (new)
- apps/learn-english/src/components/shell/app-sidebar.tsx
- apps/learn-english/src/app/globals.css

## Expected Outcome

- A thin handle on the expanded sidebar's right edge shows a line on hover and a `col-resize` cursor; dragging it sets `--sidebar-width` between 256px and 300px, and the page content follows with no lag (width transitions are off while dragging).
- The handle is a focusable `separator` ("Kéo để đổi độ rộng thanh bên"): Arrow Left/Right change the width by 8px, Home/End jump to the limits; a double click resets the default width.
- The width is a device preference in localStorage (`learn-english:sidebar-width`), restored on load; not in backups or sync. It is hidden when the sidebar is collapsed to icons and on phones.

## Quality Gates

- pnpm --filter learn-english lint
- pnpm --filter learn-english typecheck
- pnpm --filter learn-english test
