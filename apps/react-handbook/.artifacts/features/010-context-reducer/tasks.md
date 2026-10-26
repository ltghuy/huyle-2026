---
id: "010"
feature: context-reducer
created: 2026-10-07
---

# Tasks: Context + useReducer State Management

## Summary

Total: 9 | Completed: 9 | Remaining: 0

## Execution Plan

```
T001 ──┐
T002 ──┼──> T004 ──> T005 ──> T006 ──┬──> T007 ──┐
T003 ──┘                            └──> T008 ──┴──> T009
```

## Quality Gates

Run after each task or batch:

- `pnpm typecheck`
- `pnpm lint`
- `pnpm build` (after UI tasks)

## Tasks

### Foundations

- [x] T001 [P] Shop schema + server store + routes (AC-001, AC-024–027 server side)
  - **Done when:** GET products returns 24 products; POST checkout returns an order, a 500 or a 409 with adjustments per `fail`; invalid bodies get 422.

- [x] T002 [P] Cart ops + root reducer + action union (AC-002–006, AC-012–019)
  - **Done when:** script check passes: purity on deep-frozen states, 100 random actions + undo/redo equality, cap at 50, jump, eligibility removal, exhaustive switch compiles.

- [x] T003 [P] Cart storage (AC-020, AC-021, AC-023)
  - **Done when:** script check: v2 round trip, v1 migration, corrupt/unknown version/unknown products/over-stock handled with notes.

### Sharing and UI

- [x] T004 [B:T001,T002,T003] Store, three providers, consumer hooks, render counter (AC-007–011)
  - **Done when:** hooks compile under rules of hooks; counters and reports work.

- [x] T005 [B:T004] Shop root: strategy switch handoff, router dispatch, catalog, hydration, persistence, sync (AC-008, AC-020–022)
  - **Done when:** switching keeps state; reload restores; second tab syncs.

- [x] T006 [B:T005] Shop UI: header, grid, cart panel (lines, discount, totals), undo bar (AC-001–006, AC-012–015)
  - **Done when:** the independent tests of stories 1–3 pass in the browser.

- [x] T007 [P] [B:T006] Action log with time travel + render reports panel (AC-009, AC-016–019)
  - **Done when:** jump shows the state after the action; reports list last 10.

- [x] T008 [P] [B:T006] Checkout flow (AC-024–027)
  - **Done when:** success, network failure and conflict behave as specified, cart edits blocked while pending.

### Wrap-up

- [x] T009 [B:T007,T008] Demo controls, route, catalog, guide, knowledge; full verification
  - **Done when:** every AC and success criterion verified on a production build; quality gates pass.
