---
id: 028
feature: bundlers
created: 2026-10-13
---

# Tasks: Bundlers

## Summary

Total: 7 | Completed: 7 | Remaining: 0

## Execution Plan

```
T001 --> T002 --> T003 --> T004 --> T005 --> T006 --> T007
```

## Quality Gates

- pnpm lint / pnpm typecheck / pnpm build
- scratch bundler tests (after T001-T003)

## Tasks

- [x] T001 Projects + resolver + graph (with scratch tests)
  - **Done when:** resolver cases and graph cycles pass
- [x] T002 [B:T001] Linker + runtime; native-ESM order check
  - **Done when:** bundle run log equals Node's ESM log for the shop sample; circular sample throws the TDZ ReferenceError
- [x] T003 [B:T002] Tree shaker + chunker + HMR propagation (scratch tests)
  - **Done when:** expected outcomes for each toggle
- [x] T004 [B:T003] Route, catalog, content; topic 01 demos (resolver, file editor, graph)
  - **Done when:** AC-001..005 observable
- [x] T005 [B:T004] Topic 02 runtime + topic 03 tree shaking demos
  - **Done when:** AC-006..011 observable
- [x] T006 [B:T004] Topic 04 split + topic 05 dev servers/HMR demos
  - **Done when:** AC-012..016 observable
- [x] T007 Verify (gate, axe, 360 px, keyboard), knowledge, audit
  - **Done when:** all ACs `[x]`

## Requirements Coverage

| Requirement | Tasks |
| --- | --- |
| AC-001..005 | T001, T004 |
| AC-006..008 | T002, T005 |
| AC-009..011 | T003, T005 |
| AC-012..014 | T003, T006 |
| AC-015..016 | T003, T006 |
