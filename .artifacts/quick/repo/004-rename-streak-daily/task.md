---
slug: rename-streak-daily
status: done
branch: main
created: 2026-11-03
---

# Quick Task: Rename "English with Evan" to "Streak Daily"

## What

Learn English shows a new name, "Streak Daily", wherever it showed "English with Evan": page titles and SEO metadata, the share image, JSON-LD, the sidebar, the welcome dialog, the icon label, the credits description, the certificate, and the portfolio's project card.

## Files

- apps/learn-english/src/lib/site.ts (`SITE_NAME`), src/app/layout.tsx (keyword), src/app/icon.svg, src/app/(app)/credits/page.tsx
- apps/learn-english/src/components/shell/app-sidebar.tsx, tour/app-tour.tsx, profile/certificate.ts (+ profile.test.tsx)
- apps/web/src/content/projects.ts (name, id `streak-daily`), apps/web/e2e/home.spec.ts
- CLAUDE.md, apps/learn-english/CLAUDE.md, .agents/knowledge.md

## Expected Outcome

No "English with Evan" is left in code or current docs. The domain english.huyle.work, the author "Huy Le (Evan)", and the package/folder names stay.

## Quality Gates

- pnpm --filter learn-english lint / typecheck / test
- pnpm --filter web lint / typecheck / test
