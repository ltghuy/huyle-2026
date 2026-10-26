---
slug: sidebar-active-dot
completed: 2026-10-12
---

# Summary: Sidebar shows a dot only on the current page, and a new header subtitle

## What Changed

The sidebar dot now marks the current page only (green `bg-success`); other items keep a transparent dot so titles don't shift. Unbuilt items, which used to get a grey dot, now show muted text plus the existing sr-only "(coming soon)". The header subtitle is "{practices} practices · {topicPages} topics", derived from the catalog. AC-003 updated first; lint, typecheck and build pass; checked in a browser on `/security/jwt` (only "JSON Web Tokens" has a dot).

## Files Modified

| File | Change |
|------|--------|
| src/components/playground/practice-nav.tsx | Dot only on the active item; muted text for unbuilt items |
| src/components/playground/app-sidebar.tsx | Subtitle shows content totals |
| .artifacts/features/react-handbook/001-practice-playground/spec.md | AC-003 covers the active dot and header subtitle |

## Patterns Discovered

None.

## Follow-Up

None.
