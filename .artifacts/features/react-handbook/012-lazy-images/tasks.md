---
id: "012"
feature: lazy-images
created: 2026-10-07
---

# Tasks: Lazy-Loaded Images

## Summary

Total: 7 | Completed: 7 | Remaining: 0

## Execution Plan

```
T001 ──> T002 ──┬──> T004 ──> T005 ──> T006 ──> T007
T003 [P] ───────┘
```

## Quality Gates

Run after each task or batch:

- `pnpm typecheck`
- `pnpm lint`
- `pnpm build` (after UI tasks)

## Tasks

### Server

- [x] T001 Photo schema + service (photo list, SVG render, run settings/stats, serveImage) (AC-001, AC-004, AC-015, AC-017 server side)
  - **Done when:** service compiles; SVG bytes grow with width; stats cap works.

- [x] T002 [B:T001] Routes: photos, images/[id], runs (AC-001, AC-010, AC-015)
  - **Done when:** curl: list of 24/48/96, SVG at each width, 422 on bad query, 404 unknown id/run, failRate 1 → 500, an aborted request is counted as cancelled.

### Client engine

- [x] T003 [P] Client API + LazyLoader + RunMetrics + Run (AC-002, AC-003, AC-005, AC-008, AC-010, AC-014, AC-016, AC-017)
  - **Done when:** modules compile and lint; loader handles attach/detach/destroy, delay, cancel, retry, fallback.

### UI

- [x] T004 [B:T002,T003] Tiles + gallery (placeholders, reserve space, native/eager tiles, scroller, fly through) (AC-001, AC-003, AC-004, AC-006, AC-007, AC-012, AC-013, AC-018–021)
  - **Done when:** gallery renders all three strategies with placeholders and retry in the browser.

- [x] T005 [B:T004] Demo: controls, run lifecycle, counters, results table (AC-009–011, AC-014, AC-015)
  - **Done when:** switching strategy starts a fresh run; counters match the server; the table keeps one row per strategy.

### Wrap-up

- [x] T006 [B:T005] Route, catalog `built: true`, explanation guide
  - **Done when:** /practices/lazy-images renders the frame with the guide; quality gates pass.

- [x] T007 [B:T006] Full verification (every AC and success criterion in the browser, axe both themes, 360 px), knowledge entries
  - **Done when:** all ACs `[x]` with evidence; ready for audit.

## Requirements Coverage

| Requirement | Tasks      |
| ----------- | ---------- |
| AC-001      | T001, T002, T004 |
| AC-002      | T003 |
| AC-003      | T003, T004 |
| AC-004      | T001, T004 |
| AC-005      | T003, T004 |
| AC-006, AC-007 | T004 |
| AC-008      | T003 |
| AC-009, AC-010, AC-011 | T005 |
| AC-012, AC-013 | T004 |
| AC-014      | T003, T004, T005 |
| AC-015      | T001, T002, T005 |
| AC-016, AC-017 | T003 |
| AC-018–AC-021 | T004 |
