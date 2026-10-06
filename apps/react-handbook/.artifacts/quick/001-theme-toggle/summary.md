---
slug: theme-toggle
completed: 2026-10-06
---

# Summary: Light / Dark / System theme toggle

## What Changed

Added a theme control to the top bar that cycles Light → Dark → System (default System, which follows the OS live). Dark tokens are keyed on a `.dark` class that an inline `<head>` script sets from the saved choice before first paint, so there's no flash and no hydration mismatch (`<html suppressHydrationWarning>`). The toggle reads the theme through `useSyncExternalStore`, saves to localStorage (falls back to session-only when storage is blocked) and syncs other tabs. Feature 001's spec now includes the theme story (AC-023–026) instead of listing a toggle as out of scope.

Auditing light mode for the first time surfaced pre-existing contrast failures, fixed here: the active sidebar number, the green "Built" badge, the "Coming soon" badges, and the toast merge-count badge.

## Files Modified

| File | Change |
|------|--------|
| src/app/globals.css | `dark` variant and tokens keyed on `.dark`; per-theme `color-scheme`; light `--success` darkened for 4.5:1 on its tint |
| src/app/layout.tsx | Pre-paint theme script; `suppressHydrationWarning` |
| src/components/playground/theme-toggle.tsx | New icon button (sun / moon / monitor) |
| src/components/playground/top-bar.tsx | Toggle at the right end |
| src/components/playground/practice-nav.tsx | Active item number uses the accent foreground (contrast) |
| src/components/playground/status-badge.tsx | "Coming soon" text `text-foreground/75` (contrast) |
| src/practices/toast-notifications/toast-item.tsx | Merge-count text `text-foreground/75` (contrast) |

## Verification

- OS dark: System → Light → Dark → System cycle with matching class, `color-scheme`, storage and accessible name; six rapid clicks cycle correctly.
- Saved Light survives a reload and client navigation; script is a blocking `<script>` in `<head>` before `<body>`.
- Storage blocked: toggle still works for the page.
- axe-core on the overview, three built practices (with toasts, open/collapsed sections, loaded feed) and a placeholder, in **light and dark**: 0 serious, 0 critical (only the pre-existing moderate `region`); merge-count badge passes in both themes.

## Patterns Discovered

- Audit both themes; avoid muted-on-muted text (recorded in knowledge.md).
- Read live values in cycling toggles (recorded in knowledge.md).

## Follow-Up

- Scope ended at 7 files (4 planned + 3 contrast fixes), above quick mode's 3-file guideline; acceptable because the extra files were one-line contrast fixes found during verification.
