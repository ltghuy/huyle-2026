---
id: "008"
feature: virtualized-list
created: 2026-10-07
---

# Tasks: Virtualized Large Lists

## Summary

Total: 9 | Completed: 9 | Remaining: 0

## Execution Plan

```
T001 ──┐
T002 ──┼──> T004 ──> T005 ──> T006 ──> T007 ──> T008 ──> T009
T003 ──┘
```

## Quality Gates

Run after each task or batch:

- `pnpm typecheck`
- `pnpm lint`
- `pnpm build` (after UI tasks)

## Tasks

### Pure logic

- [x] T001 [P] Ticket generator + chunked store (`tickets.ts`)
  - **Done when:** `generate(key)` is deterministic per key; `ensure(100000)` completes in chunks with no task over 50 ms; folded text has accents removed.

- [x] T002 [P] View builder (`view.ts`)
  - **Done when:** the four sort orders are correct on a script check; multi-word, accent-insensitive filter works; base orders are cached per (sort, count).

- [x] T003 [P] Fenwick tree + Virtualizer (`fenwick.ts`, `virtualizer.ts`)
  - **Done when:** a script check passes: prefix/indexAt match naive sums on random sizes; window = visible ± overscan + pinned; anchor restore keeps the top row after measuring rows above; reveal start/nearest/offset produce the expected scrollTop; setKeys keeps sizes by key.

### List UI

- [x] T004 [B:T001,T002,T003] `useVirtualizer` hook, row, virtual list, stats store (AC-001–006, AC-008, AC-012, AC-013, AC-015, AC-026–028)
  - **Done when:** 100k rows scroll with a bounded DOM, corrections don't jump, width resize keeps the top row, stats + debug view render.

- [x] T005 [B:T004] Keyboard, focus, selection + details (AC-009–011)
  - **Done when:** arrows/Page/Home/End move a focused, fully visible active row; Enter/Space/click select and show details; mouse-scrolling away keeps the active row in the DOM.

- [x] T006 [B:T005] Naive list + mode switch + naive limit (AC-014, AC-016, AC-017)
  - **Done when:** naive renders all rows with the same behavior; switching keeps the top row; above 20k naive is disabled/forced off with a reason.

- [x] T007 [B:T006] Toolbar: filter, sort, jump; keep place; empty state; announcements (AC-007, AC-018–025)
  - **Done when:** jumps land within 1 px; filter/sort keep the selected row's distance; empty state + Clear filter; "N tickets match" announced; jump validation inline.

### Page

- [x] T008 [B:T007] Demo controls, route, catalog, explanation guide
  - **Done when:** practice 7 is listed as built, the page renders with the guide in the shared shape, controls apply live.

- [x] T009 [B:T008] Full verification (success criteria, a11y both themes, 360 px)
  - **Done when:** every AC and success criterion is checked in the browser on a production build; quality gates pass.
