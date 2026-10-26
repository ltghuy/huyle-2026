---
id: "015"
feature: large-dataset-performance
created: 2026-10-08
---

# Tasks: Large Dataset Performance Optimization

## Summary

Total: 9 | Completed: 9 | Remaining: 0

## Execution Plan

```
T001 --> T002 --┐
T003 -----------┼--> T005 --> T006 --> T007 --> T008 --> T009
T004 -----------┘
```

## Quality Gates

Run after each task or batch:

- pnpm lint
- pnpm typecheck
- pnpm build (after T002 and at the end)

## Tasks

### Data

- [x] T001 Create the instrument schema and deterministic generator (cached per size)
  - **Done when:** typecheck passes; symbols are unique at 50,000. -- VERIFIED

- [x] T002 [B:T001] Add the dataset route and the client dataset loader (module cache per size, retry clears it)
  - **Done when:** GET returns 5,000 / 20,000 / 50,000 rows; 422 on other sizes; build passes. -- VERIFIED

### Pure logic

- [x] T003 [P] Write `feed.ts` (seeded PRNG, update batches, immutable apply with and without an index) and `derive.ts` (folded filter, stable sorts)
  - **Done when:** a scratch script shows indexed and scanning apply produce deep-equal arrays, changed rows get new objects, unchanged rows keep identity, sorts are stable. -- VERIFIED

- [x] T004 [P] Write the metrics store (render timer, row counter, timings, input delay, fps, long tasks, recording, slow-render listener, panel hook) and the benchmark script + results store
  - **Done when:** typecheck passes; a scratch script drives the render timer and recording and gets correct medians/p95. -- VERIFIED in the browser instead (benchmark runs report medians, p95, worst input, long tasks and fps consistent with the live panel); no separate scratch script was written

### UI

- [x] T005 [B:T002,T003,T004] Build the board (header sort buttons, windowed and full bodies, memo and plain rows, empty state) and the demo state (dataset, feed with pause/visibility, filter with optional deferral, sort, selection, flags, safety pause)
  - **Done when:** the board loads, updates live, filters, sorts and selects with every flag combination. -- VERIFIED

- [x] T006 [B:T005] Build the optimization panel (presets, switches, windowing-off confirmation), metrics panel, details panel, benchmark panel; the page route; flip the catalog entry
  - **Done when:** all panels work in the browser; the benchmark adds result rows. -- VERIFIED

- [x] T007 [B:T006] Write the explanation guide
  - **Done when:** every topic in the spec Notes is covered and every control has a row. -- VERIFIED

### Verification

- [x] T008 [B:T007] Verify: equivalence across 50 flag combinations, benchmark ratios at 20k and 50k, memo row counts, safety guards, accessibility both themes, 360 px; mark ACs
  - **Done when:** all ACs proven and marked `[x]`, or failures fixed. -- VERIFIED

- [x] T009 [B:T008] Record knowledge, set `to-review`, audit Goals and Success Criteria
  - **Done when:** audit.md written, status `done`. -- VERIFIED

## Requirements Coverage

| Requirement | Tasks |
| ----------- | ----- |
| AC-001 | T001, T002, T005 |
| AC-002 | T003, T005 |
| AC-003, AC-004 | T003, T005 |
| AC-005 | T005, T006 |
| AC-006–AC-012 | T003, T005, T006 |
| AC-013–AC-017 | T004, T006 |
| AC-018–AC-020 | T004, T006 |
| AC-021, AC-022 | T004, T005, T006 |
| AC-023 | T002, T005 |
