---
slug: interview-handbook-sections
completed: 2026-10-08
---

# Summary: Turn the playground into a Frontend Interview Handbook with sections

## What Changed

The site is now the "Frontend Interview Handbook", organised into sections so it can grow beyond the 14 React practices. React Practices became a section with its own URL prefix (`/react-practices`, with an index page holding the old overview grid) and a collapsible folder in the sidebar; Browser & Web Platform, Performance & Accessibility and Frontend System Design are listed as coming soon. The home page now introduces the handbook, how to use it, and a card per section (React Practices with build progress). Practice pages show a breadcrumb (Handbook › React Practices › practice). Old `/practices/*` links redirect permanently, keeping their query string. Feature 001's spec (AC-001, 006, 008, 014–016) was updated first and re-verified.

## Files Modified

| File | Change |
|------|--------|
| `src/practices/catalog.ts` | `SITE_NAME`, `sections`, `PRACTICES_PATH`, `practiceHref()` |
| `src/app/(playground)/practices/` → `react-practices/` | Route folder moved (git mv); `PageProps` paths updated; new section index `page.tsx` |
| `next.config.ts` | 308 redirects `/practices` and `/practices/:slug` |
| `src/app/(playground)/page.tsx` | Handbook home: intro, how to use it, section cards |
| `src/components/playground/app-sidebar.tsx`, `practice-nav.tsx` | Handbook name and progress; Sections group with the React Practices folder (Collapsible) and coming-soon sections; filter covers practices and section names |
| `src/components/playground/section-icon.tsx`, `breadcrumbs.tsx` | New: icon per section; breadcrumb navigation |
| `src/components/playground/practice-frame.tsx` | Breadcrumb above the title |
| `src/components/playground/top-bar.tsx`, `src/app/layout.tsx`, `src/app/(playground)/not-found.tsx` | Site name, tab title template, menu label, generic not-found text |
| `src/components/ui/collapsible.tsx` | Added with the shadcn CLI |
| `.artifacts/features/react-handbook/001-practice-playground/spec.md` | Sections, new addresses with redirect, home and section pages |
| `.agents/knowledge.md` | Route location; sections decision |

## Patterns Discovered

- A new handbook section = an entry in `sections` (href once it has content), a route folder under `src/app/(playground)/{section}/`, and a sidebar folder; recorded in `.agents/knowledge.md`.
- Collapsing the sidebar folder is remembered only for the page where it happened (state holds that pathname), so opening a practice re-opens it without an effect.

## Follow-Up

- Practice code (`src/practices/*`) and APIs (`/api/practices/*`) keep their names; rename them only if the other sections make "practices" ambiguous.
- Verified: every route 200/404 as expected, `/practices/multi-step-form?step=role` → 308 to the new address with the query; sidebar folder toggle, auto-reopen, current item, filter and no-match message; axe in both themes on `/`, `/react-practices` and a practice (only the moderate `region` from feature 001 at desktop width, 0 at 360 px); no sideways scroll at 360 px; mobile sheet. Keyboard behavior of the folder toggle relies on Base UI's Collapsible trigger (a button with `aria-expanded`), checked by attribute, not with real key presses.
