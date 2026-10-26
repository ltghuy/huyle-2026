---
id: "024"
feature: design-news-feed
created: 2026-10-12
---

# Tasks: Design a news feed

## Summary

Total: 5 | Completed: 5 | Remaining: 0

## Execution Plan

```
T001 --> T002 (pagination logic) --> T003 (demos + diagram) --> T004 (content) --> T005 (verify)
```

## Quality Gates

Run after each task or batch: pnpm lint · pnpm typecheck · pnpm build.

## Tasks

- [x] T001 Add the `news-feed` catalog entry, the page route and a content skeleton (intro, TOC, four `Topic` placeholders); link to it from the method page's "Next" block
  - **Done when:** `/system-design/news-feed` shows breadcrumbs, title and TOC; System Design shows 2 of 2 written; the method page links here.

- [x] T002 [B:T001] Write `pagination.ts`: a growing post list, `offsetPage` and `cursorPage`, and a seen-id diff that marks duplicates/skips
  - **Done when:** a scratch check shows offset duplicates or skips an item after a head insert, and cursor stays stable.

- [x] T003 [B:T002] Build the architecture diagram (theme-aware inline SVG + legend), the pagination demo (offset vs cursor, "new posts arrive", seen/duplicate/skip marking) and the optimistic-like demo (instant update, rejection toggle, exact rollback)
  - **Done when:** in the browser, offset shows a duplicate/skip and cursor doesn't; an optimistic like reverts to the exact count with rejection on; the diagram reads in both themes.

- [x] T004 [B:T003] Write the four topics (requirements from the feed dataset; architecture + rendering choice; data model + pagination; deep dives linking the built practices + freshness/ranking) and the read-more
  - **Done when:** each topic reads in about one screen; every deep dive links its built practice; a figure is labelled an example with an alternative.

- [x] T005 [B:T004] Verify (gates, axe light/dark, 360 px, keyboard), update knowledge.md, audit
  - **Done when:** typecheck, lint, build pass; ACs marked with evidence; audit written.
