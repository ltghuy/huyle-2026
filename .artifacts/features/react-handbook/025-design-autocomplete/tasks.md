---
id: "025"
feature: design-autocomplete
created: 2026-10-12
---

# Tasks: Design an autocomplete

## Summary

Total: 5 | Completed: 5 | Remaining: 0

## Execution Plan

```
T001 --> T002 (sim logic) --> T003 (demos + diagram) --> T004 (content) --> T005 (verify)
```

## Quality Gates

Run after each task or batch: pnpm lint · pnpm typecheck · pnpm build.

## Tasks

- [x] T001 Add the `autocomplete` catalog entry, the page route and a content skeleton (intro, TOC, three `Topic` placeholders)
  - **Done when:** `/system-design/autocomplete` shows breadcrumbs, title and TOC; System Design shows 3 of 3 written.

- [x] T002 [B:T001] Write `search-sim.ts`: CORPUS, normalise, substring search, deterministic latency, and a crafted burst that forces an out-of-order arrival
  - **Done when:** a scratch check shows the burst, with the guard off, applying a stale earlier response, and with the guard on, dropping it; debounce reduces request count; a cache hit issues no request.

- [x] T003 [B:T002] Build the architecture diagram (theme-aware SVG), the lifecycle demo (debounce + stale-guard toggles, request log, displayed-vs-current verdict, replay burst) and the accessible combobox demo (type to filter, arrow/Enter/Escape, aria-activedescendant, highlight)
  - **Done when:** in the browser, guard off leaves displayed≠current after the burst and guard on keeps them equal; debounce changes request count; the combobox is operable by keyboard with the active option tracked; the diagram reads in both themes.

- [x] T004 [B:T003] Write the three topics (requirements from the dataset; architecture + alternative; request lifecycle; deep dives: a11y + ranking linking debounced-search) and the read-more
  - **Done when:** each topic reads in about one screen; the deep dive links the practice; a figure is labelled an example with an alternative.

- [x] T005 [B:T004] Verify (gates, axe light/dark, 360 px, keyboard), update knowledge.md, audit
  - **Done when:** typecheck, lint, build pass; ACs marked with evidence; audit written.
