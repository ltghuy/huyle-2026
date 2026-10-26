---
id: "009"
feature: accessible-modal
created: 2026-10-07
---

# Tasks: Accessible Modal

## Summary

Total: 8 | Completed: 8 | Remaining: 0

## Execution Plan

```
T001 ──> T002 ──> T003 ──┬──> T004 ──┐
                         ├──> T005 ──┼──> T007 ──> T008
                         └──> T006 ──┘
```

## Quality Gates

Run after each task or batch:

- `pnpm typecheck`
- `pnpm lint`
- `pnpm build` (after UI tasks)

## Tasks

### Core

- [x] T001 Modal engine (`modal-engine.ts`)
  - **Done when:** push/pop maintain the stack; inert walk keeps `data-modal-keep` and the top layer; scroll lock adds the gutter only with a classic scrollbar; Tab wrap, focus guard, Escape routing, backdrop press+release, focus return chain and viewport vars are implemented; every operation is idempotent.

- [x] T002 [B:T001] Store + `<Modal>` + `<ModalHost />`, toaster keep attribute, layout mount (AC-001–011, AC-016, AC-020–024, AC-027)
  - **Done when:** a test dialog and `confirm()` open from the page with the right ARIA, focus and animation; layout switches; toasts stay usable; navigation closes everything.

- [x] T003 [B:T002] Practice route, catalog, demo shell with controls and event log (AC-026, AC-027)
  - **Done when:** the page renders with controls and an empty log that fills as dialogs open and close.

### Scenarios

- [x] T004 [P] [B:T003] Projects + delete confirm with focus fallback (AC-009–011, AC-007)
  - **Done when:** deleting focuses the next row or "New project"; backdrop ignored; toast shown.

- [x] T005 [P] [B:T003] Edit profile with validation and discard guard (AC-012–015)
  - **Done when:** every dismissal with edits asks first; Keep editing / Discard return focus correctly; invalid submit focuses the first error.

- [x] T006 [P] [B:T003] Stacked settings (3 levels), terms document, native comparison (AC-016–019, AC-025)
  - **Done when:** Escape unwinds one level at a time with focus on each opener; terms scroll inside with focus on the title; native confirm logs its events.

### Wrap-up

- [x] T007 [B:T004,T005,T006] Explanation guide + knowledge entries
  - **Done when:** guide in the shared shape covers every Notes topic; knowledge.md updated.

- [x] T008 [B:T007] Full verification (success criteria, a11y both themes, 360 px, reduced motion)
  - **Done when:** every AC and success criterion checked on a production build; quality gates pass.
