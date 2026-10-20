---
id: "033"
feature: design-micro-frontends
created: 2026-10-20
---

# Tasks: Design micro frontends

## Summary

Total: 10 | Completed: 10 | Remaining: 0

## Execution Plan

```
T001 --> T002 --> T003 --┬--> T004 --┐
                         ├--> T005 --┤
                         ├--> T006 --┤
                         ├--> T007 --┼--> T009 --> T010
                         └--> T008 --┘
```

## Quality Gates

Run after each task or batch:

- `pnpm typecheck`
- `pnpm lint`
- `pnpm build` (after T003 and at the end)
- scratch model checks for each `*.ts` model

## Tasks

### Wiring

- [x] T001 Add the catalog entry, route and a content skeleton with the seven topics
  - **Done when:** `/system-design/micro-frontends` renders breadcrumbs, title, intro and topic list; the section shows 5 of 5 written.

- [x] T002 [B:T001] Link the page from the method page, the news feed, autocomplete and monorepo pages, the section summary and README
  - **Done when:** every "next" pointer and the method page list the new page; the monorepo page links to it from its architecture point and closing note.

### Shared model and topic 01

- [x] T003 [B:T001] Write `store.ts`, the store diagram, the architecture cards, `fit.ts` and the fit demo; write topic 01 prose
  - **Done when:** AC-003, AC-004, AC-005 hold and the fit scratch checks pass.

### Deep dives

- [x] T004 [P] [B:T003] Composition model, timeline, properties and tool table; topic 02 prose
  - **Done when:** AC-006, AC-007, AC-008 hold.

- [x] T005 [P] [B:T003] Sharing model (rules from the research file) and demo; topic 03 prose
  - **Done when:** AC-009, AC-010, AC-011 hold and the sharing scratch checks pass.

- [x] T006 [P] [B:T003] Routing and contract model and demo; topic 04 prose
  - **Done when:** AC-012, AC-013, AC-014 hold and the routing scratch checks pass.

- [x] T007 [P] [B:T003] Deploy model and demo; topic 05 prose
  - **Done when:** AC-015, AC-016, AC-017 hold and the deploy scratch checks pass.

- [x] T008 [P] [B:T003] Styling demo with real CSS in shadow roots; topic 06 prose
  - **Done when:** AC-018, AC-019, AC-020 hold in both themes.

### Finish

- [x] T009 [B:T004-T008] Read-more links, closing note, humanizer pass over all prose
  - **Done when:** AC-021 holds; no em or en dashes in new prose.

- [x] T010 [B:T009] Verify: quality gates, browser checks (axe light/dark, 360 px, keyboard), knowledge entry
  - **Done when:** every AC and success criterion is proven and marked.

## Requirements Coverage

| Requirement | Tasks |
| ----------- | ----- |
| AC-001 | T001, T002 |
| AC-002 | T001 |
| AC-003 to AC-005 | T003 |
| AC-006 to AC-008 | T004 |
| AC-009 to AC-011 | T005 |
| AC-012 to AC-014 | T006 |
| AC-015 to AC-017 | T007 |
| AC-018 to AC-020 | T008 |
| AC-021 | T009 |
| Edge cases, success criteria | T010 |
