---
id: 027
feature: transpiling
created: 2026-10-13
---

# Tasks: Transpiling

## Summary

Total: 8 | Completed: 8 | Remaining: 0

## Execution Plan

```
T001 --> T002 --> T003 --> T004 ----> T008
                    ├--> T005 -----┤
                    ├--> T006 -----┤
                    └--> T007 -----┘
```

## Quality Gates

- pnpm lint
- pnpm typecheck
- pnpm build (after T004 and T008)
- scratch compiler comparison (after T002, T003)

## Tasks

### Compiler

- [x] T001 Research cache `.artifacts/research/transpilers.md`; generate `constructs.ts` and `lowering.ts` from TS 5.9.3 / Babel 7.29.9
  - **Done when:** data files contain real outputs and diagnostics

- [x] T002 [B:T001] Scanner + parser + AST types for the subset, errors with positions
  - **Done when:** scratch script parses all samples; error cases report correct line:column

- [x] T003 [B:T002] Transform + codegen + source maps; `compile()` facade
  - **Done when:** outputs match `ts.transpileModule` (react-jsx and react) on all samples, ignoring whitespace; VLQ round-trips

### Page

- [x] T004 [B:T003] Route, catalog flag, content.tsx; topic 01 compiler demo (editor, tokens, tree, output, highlight, stale errors)
  - **Done when:** AC-001..005 observable

- [x] T005 [B:T004] Topic 02 erasable constructs + type-error run
  - **Done when:** AC-006..008 observable

- [x] T006 [B:T004] Topic 03 JSX runtimes
  - **Done when:** AC-009..010 observable

- [x] T007 [B:T004] Topic 04 lowering + topic 05 source maps
  - **Done when:** AC-011..014 observable

### Verify

- [x] T008 Full verification (gate, axe, 360 px, keyboard), knowledge.md, audit
  - **Done when:** all ACs `[x]` with evidence

## Requirements Coverage

| Requirement | Tasks |
| ----------- | ----- |
| AC-001..005 | T002, T003, T004 |
| AC-006..008 | T001, T005 |
| AC-009..010 | T003, T006 |
| AC-011..012 | T001, T007 |
| AC-013..014 | T003, T007 |
