---
slug: interview-handbook-sections
status: done
branch: main
created: 2026-10-08
---

# Quick Task: Turn the playground into a Frontend Interview Handbook with sections

## What

Rename the site to "Frontend Interview Handbook" and group content into sections: the 14 practices move into a "React Practices" section (a folder in the sidebar, URLs under `/react-practices/…`), next to three "coming soon" sections (Browser & Web Platform, Performance & Accessibility, Frontend System Design), with a new home page that introduces the handbook and its sections.

> Larger than a typical quick task (route folder move plus several shell files), done in quick mode at the user's request. The move is mechanical: practice code in `src/practices/*` and the API under `/api/practices/*` stay where they are.

## Files

- `src/practices/catalog.ts`: section list (id, title, summary, path, status) and the practices' href under their section
- `src/app/(playground)/practices/` → `src/app/(playground)/react-practices/`: every practice route and `[slug]`, plus a new section index `react-practices/page.tsx`
- `next.config.ts`: permanent redirect `/practices/:slug` → `/react-practices/:slug` (and `/practices` → `/react-practices`)
- `src/components/playground/app-sidebar.tsx`, `practice-nav.tsx`: handbook name and overall progress; sections as collapsible folders, React Practices holding the 14 practices (open when a practice is current), coming-soon sections listed; filter keeps working across practices
- `src/app/(playground)/page.tsx`: home page for the handbook (intro, section cards with progress / coming soon)
- `src/components/playground/practice-frame.tsx`, `practice-placeholder.tsx` if they link or label paths
- `.artifacts/features/001-practice-playground/spec.md`: update the shell behavior (sections, addresses, overview) so code and spec stay in sync
- `.agents/knowledge.md`: route location of built practices

## Expected Outcome

- Sidebar header reads "Frontend Interview Handbook" with progress; a "React Practices" folder lists the 14 practices (number, status dot, active state) and opens automatically on a practice page; three coming-soon sections are visible and labelled as such.
- `/` is the handbook home: what it is, how to use it, and a card per section (React Practices with "N of 14 built" and a link; others marked coming soon).
- `/react-practices` lists the 14 practices (the old overview grid); `/react-practices/{slug}` opens each practice; `/practices/{slug}` (with any query string) permanently redirects to it.
- Unknown practice slugs still show the not-found page; phone width still works (sidebar as a sheet, no sideways scroll); keyboard and screen-reader behavior of the sidebar is unchanged or better.

## Quality Gates

Run after the change, before marking done:

- `pnpm lint`
- `pnpm typecheck`
- `pnpm build`
- Manual: every practice opens from the sidebar and from `/react-practices`; an old `/practices/…?step=role` link redirects with its query; axe on `/`, `/react-practices` and one practice in both themes; 360 px `scrollWidth` equals the viewport
