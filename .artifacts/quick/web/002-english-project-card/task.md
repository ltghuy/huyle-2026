---
slug: english-project-card
status: done
branch: feature/learn-english
created: 2026-10-29
---

# Quick Task: English with Evan in the Projects grid

## What

Add English with Evan (english.huyle.work) as project 02 in the portfolio's Projects section, in English and Vietnamese.

## Files

- `apps/web/src/content/projects.ts`
- `apps/web/src/content/vi.ts`
- `apps/web/e2e/home.spec.ts`

## Expected Outcome

The second card shows "English with Evan" with its role, one-liner, description, tech tags and a "Visit site" link to https://english.huyle.work/. The Vietnamese toggle shows the translated role, one-liner and description. Two "Coming soon" slots remain. The link also gives Google a path to the new subdomain.

## Quality Gates

- `pnpm --filter web lint`
- `pnpm --filter web typecheck`
- `pnpm --filter web test`
