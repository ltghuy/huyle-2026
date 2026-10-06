---
slug: theme-toggle
status: done
branch: main
created: 2026-10-06
---

# Quick Task: Light / Dark / System theme toggle

## What

Add a theme control to the playground top bar that cycles Light → Dark → System, remembers the choice, and applies it before first paint.

## Files

- src/app/globals.css: dark tokens keyed on a `.dark` class instead of the OS media query; `color-scheme` per theme
- src/app/layout.tsx: inline pre-paint script (reads the saved choice, resolves System via the OS preference, sets the class, follows OS changes while on System); `suppressHydrationWarning` on `<html>`
- src/components/playground/theme-toggle.tsx (new): icon button (sun / moon / monitor) bound to the theme via `useSyncExternalStore`
- src/components/playground/top-bar.tsx: place the toggle at the right end

Also updated (artifacts, not code): feature 001's spec (theme story replaces the "no toggle" out-of-scope row) and `.agents/knowledge.md`.

## Expected Outcome

- First visit: System (follows the OS, as before), and switching the OS theme updates the page live.
- Each click cycles Light → Dark → System; the button's accessible name says the current theme and the next one.
- The choice survives reloads and navigation, with no flash of the wrong theme on load.
- If storage is unavailable, the toggle still works for the session.

## Quality Gates

Run after the change, before marking done:

- `pnpm lint`
- `pnpm typecheck`
- n/a (no test script)
