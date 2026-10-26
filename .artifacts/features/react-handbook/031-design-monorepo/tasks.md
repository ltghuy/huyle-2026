---
id: "031"
feature: design-monorepo
created: 2026-10-20
---

# Tasks: Design a frontend monorepo

## Summary

Total: 7 | Completed: 7 | Remaining: 0

## Execution Plan

```
T001 --> T002 (models) --> T003 (diagram + tools) --┐
                       ├--> T004 (affected/cache) --┤
                       ├--> T005 (boundaries + versioning) --┼--> T006 (content) --> T007 (verify)
                       └--> CI demo (in T005) ------┘
```

## Quality Gates

Run after each task or batch:

- pnpm lint
- pnpm typecheck
- pnpm build (after T003 and T006)

## Tasks

### Wiring

- [x] T001 Add the `monorepo` catalog entry, the page route, a content skeleton (intro, TOC, six `Topic` placeholders), and links from the method page, the other two case studies, the section summary and README
  - **Done when:** `/system-design/monorepo` shows breadcrumbs, title and TOC; System Design shows 4 of 4 written; the method page and both case studies link it.

### Models

- [x] T002 [B:T001] Write the pure models: `repo.ts`, `graph.ts`, `runner.ts`, `boundaries.ts`, `versioning.ts`, `ci-model.ts`, `tools.ts` (from the research cache)
  - **Done when:** a scratch check passes every scenario in design.md's New Tests table.

### Demos

- [x] T003 [B:T002] Build `repo-graph.tsx`, the architecture demo (diagram + monorepo/polyrepo/micro-frontends) and the tools demo (capability filter + matrix)
  - **Done when:** the diagram reads in both themes and at 360 px; picking capabilities filters the tools.

- [x] T004 [B:T002] Build the affected + cache demo: changed toggles, task/scope/machine pickers, cache mode, run timeline, totals
  - **Done when:** in the browser, AC-006..009 scenarios behave as specified.

- [x] T005 [B:T002] Build the boundaries demo, the versioning demo (policy, phantom deps, changesets) and the CI demo (chart + table)
  - **Done when:** in the browser, AC-010, AC-012, AC-013, AC-015 and AC-016 behave as specified.

### Content

- [x] T006 [B:T003,T004,T005] Write the six topics' text (requirements, architecture, tools, affected/caching, boundaries/ownership, deps/versioning, CI/DX), advice and read-more links
  - **Done when:** each topic reads in about one screen, every figure is labelled an example with an alternative, links resolve.

### Verify

- [x] T007 [B:T006] Verify (gates, axe light/dark, 360 px, keyboard), mark ACs, update knowledge.md, audit
  - **Done when:** typecheck, lint, build pass; ACs marked with evidence; audit written.

## Requirements Coverage

| Requirement | Tasks |
| ----------- | ----- |
| AC-001, AC-002 | T001 |
| AC-003, AC-011, AC-014, AC-017, AC-018 | T006 |
| AC-004, AC-005 | T002, T003 |
| AC-006, AC-007, AC-008, AC-009 | T002, T004 |
| AC-010, AC-012, AC-013, AC-015, AC-016 | T002, T005 |
