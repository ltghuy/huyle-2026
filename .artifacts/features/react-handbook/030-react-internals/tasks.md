---
id: 030
feature: react-internals
created: 2026-10-13
---

# Tasks: Inside React

## Summary

Total: 5 | Completed: 5 | Remaining: 0

## Execution Plan

```
T001 --> T002 --> T003 --> T004 --> T005
```

## Quality Gates

- pnpm lint / pnpm typecheck / pnpm build

## Tasks

- [x] T001 Route, catalog, content shell; elements runner + ElementsDemo
  - **Done when:** AC-001..003 observable
- [x] T002 Isolated root hook, fiber walker + FibersDemo
  - **Done when:** AC-004..006 observable
- [x] T003 ReconcileDemo
  - **Done when:** AC-007..009 observable
- [x] T004 PhasesDemo + SchedulingDemo; write topic text from measured results
  - **Done when:** AC-010..013 observable
- [x] T005 Verify (gate, axe, 360 px, keyboard), knowledge, audit, section complete
  - **Done when:** all ACs `[x]`

## Requirements Coverage

| Requirement | Tasks |
| --- | --- |
| AC-001..003 | T001 |
| AC-004..006 | T002 |
| AC-007..009 | T003 |
| AC-010..013 | T004 |
