---
slug: sidebar-resize
completed: 2026-11-09
---

# Summary: Drag the sidebar's edge to resize it

## What Changed

The expanded desktop sidebar has a drag handle on its right edge. Dragging sets `--sidebar-width` on the sidebar wrapper, clamped to 256 to 300px, by writing the CSS variable directly, so nothing re-renders during a drag. The width transitions are off while dragging. The handle is a focusable `separator` (arrow keys, Home/End). A double click resets the default width. The width is kept in localStorage (`learn-english:sidebar-width`) and restored on load. Checked in Chrome: a drag past the limit stops at 300px, the width survives a reload, and a double click clears it.

## Files Modified

| File | Change |
|------|--------|
| apps/learn-english/src/components/shell/sidebar-resize-handle.tsx | New handle component |
| apps/learn-english/src/components/shell/app-sidebar.tsx | Renders the handle inside the sidebar |
| apps/learn-english/src/app/globals.css | `[data-sidebar-resizing]` turns off width transitions and text selection |

## Patterns Discovered

None.

## Follow-Up

The stored width is applied after hydration, so a learner who widened the sidebar sees it start at 256px for a frame on load. A pre-paint script like `ACCENT_SCRIPT` would fix that if it shows.
