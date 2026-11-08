---
slug: rename-tuxedo-english
completed: 2026-11-08
---

# Summary: Rename "Streak Daily" to "Tuxedo English"

## What Changed

Every learner-facing "Streak Daily" is now "Tuxedo English". Most of it flows from `SITE_NAME`: tab titles, Open Graph and Twitter cards, JSON-LD, the generated share image, the hero wordmark and the footer. The hard-coded spots changed too: the sidebar, the welcome dialog, the icon's aria-label, the SEO keyword, the descriptions of the credits, privacy, terms and Arena room pages, the certificate's text and canvas header ("TUXEDO ENGLISH"), and the portfolio card (name and `id`). The CLAUDE.md files and knowledge.md use the new name.

## Files Modified

| File | Change |
|------|--------|
| apps/learn-english/src/lib/site.ts | `SITE_NAME = "Tuxedo English"` |
| apps/learn-english/src/app/layout.tsx, icon.svg, (app)/credits, privacy, terms, (focus)/arena/room pages | keyword, aria-label, descriptions |
| apps/learn-english/src/components/shell/app-sidebar.tsx, tour/app-tour.tsx, mascot/mascot.tsx | sidebar name, welcome title, comment |
| apps/learn-english/src/components/profile/certificate.ts, profile.test.tsx, src/app/(app)/page.test.tsx | certificate text and header, tests |
| apps/web/src/content/projects.ts, e2e/home.spec.ts | project card name and id |
| CLAUDE.md, apps/learn-english/CLAUDE.md, .agents/knowledge.md | new name |

## Patterns Discovered

None.

## Follow-Up

- On a 360 px phone the hero wordmark now takes two lines ("Tuxedo / English"); it fits without horizontal scroll.
- Past artifacts keep the old name as history. Certificates already saved as images keep "Streak Daily".
- The learning streak itself ("chuỗi ngày học", `StreakSummary`, the streak board) is a feature, not the brand, and keeps its name.
- The portfolio e2e test was updated but not run.
