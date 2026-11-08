---
slug: rename-tuxedo-english
status: done
branch: main
created: 2026-11-08
---

# Quick Task: Rename "Streak Daily" to "Tuxedo English"

## What

Learn English shows a new name, "Tuxedo English", wherever it showed "Streak Daily": `SITE_NAME` (page titles, Open Graph, Twitter, JSON-LD, the share image, the hero wordmark, the footer), the sidebar, the welcome dialog, the icon label, the SEO keyword, page descriptions (credits, privacy, terms, Arena room), the certificate, the mascot comment, and the portfolio's project card.

## Files

- apps/learn-english/src/lib/site.ts, src/app/layout.tsx, src/app/icon.svg, the credits, privacy, terms and Arena room pages
- apps/learn-english/src/components/shell/app-sidebar.tsx, tour/app-tour.tsx, profile/certificate.ts, mascot/mascot.tsx and the tests that name the site
- apps/web/src/content/projects.ts (name, id `tuxedo-english`), apps/web/e2e/home.spec.ts
- CLAUDE.md, apps/learn-english/CLAUDE.md, .agents/knowledge.md

## Expected Outcome

No "Streak Daily" is left in code or current docs. The learning streak itself ("chuỗi ngày học", `StreakSummary`) keeps its name, as do the domain english.huyle.work, the author and the package and folder names. Past artifacts keep the old name as history.

## Quality Gates

- pnpm --filter learn-english lint / typecheck / test / build
- pnpm --filter web lint / typecheck / test
