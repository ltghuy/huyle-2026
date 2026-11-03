---
slug: rename-streak-daily
completed: 2026-11-03
---

# Summary: Rename "English with Evan" to "Streak Daily"

## What Changed

Every learner-facing "English with Evan" is now "Streak Daily". Most of it flows from `SITE_NAME` (tab titles, Open Graph and Twitter cards, JSON-LD, the generated share image). The hard-coded spots changed too: the sidebar, the welcome dialog, the icon's aria-label, the credits description, the SEO keyword, the certificate's text and canvas header ("STREAK DAILY"), and the portfolio card (name and `id`). The CLAUDE.md files and knowledge.md note the new name.

## Files Modified

| File | Change |
|------|--------|
| apps/learn-english/src/lib/site.ts | `SITE_NAME = "Streak Daily"` |
| apps/learn-english/src/app/layout.tsx, icon.svg, (app)/credits/page.tsx | keyword, aria-label, description |
| apps/learn-english/src/components/shell/app-sidebar.tsx, tour/app-tour.tsx | sidebar name, welcome title |
| apps/learn-english/src/components/profile/certificate.ts, profile.test.tsx | certificate text and header |
| apps/web/src/content/projects.ts, e2e/home.spec.ts | project card name and id |
| CLAUDE.md, apps/learn-english/CLAUDE.md, .agents/knowledge.md | name noted |

## Patterns Discovered

None.

## Follow-Up

- Past artifacts (quick tasks web/002, learn-english/002 and /019) keep the old name as history.
- Certificates already saved as images keep the old name.
