---
id: "017"
feature: accessibility-handbook
created: 2026-10-08
---

# Tasks: Accessibility Handbook

## Summary

Total: 7 | Completed: 7 | Remaining: 0

## Execution Plan

```
T001 --> T002 --┐
T003 -----------┤
T004 -----------┼--> T006 --> T007
T005 -----------┘
```

## Quality Gates

Run after each task or batch:

- pnpm lint
- pnpm typecheck
- pnpm build (after T001 and at the end)

## Tasks

### Shell

- [x] T001 Share Topic and Toc under `src/handbook/`, mark Accessibility written, page renders the new content shell
  - **Done when:** Performance page unchanged; Accessibility page shows header, intro, TOC; section counts 2/2; build passes. -- VERIFIED

- [x] T002 [B:T001] Simplified reader (`a11y-reader.ts`)
  - **Done when:** typecheck passes; readings of a button, a placeholder-only input and a labelled input with a hint match the expected lines in the browser. -- VERIFIED

### Demos

- [x] T003 [P] Semantics, structure and focus demos
  - **Done when:** div skipped by Tab, outline differs by build, positive tabindex puts the element first in the tab order and Tab skips it in place. -- VERIFIED

- [x] T004 [P] Dynamic content, alt text and media, forms demos
  - **Done when:** log announces only with the live region on; alt feedback changes; error summary takes focus. -- VERIFIED

- [x] T005 [P] Contrast, typography, motion and annotations demos
  - **Done when:** contrast script values match; fixed card reports clipped text; banner static under reduced motion; annotation table lists names. -- VERIFIED

### Content and verification

- [x] T006 [B:T002,T003,T004,T005] Write the ten topics with notes, Do/Avoid and web.dev links; wire the demos
  - **Done when:** all 13 modules linked; AC-017 notes present; prose under ~2,000 words. -- VERIFIED

- [x] T007 [B:T006] Verify all ACs (browser, axe both themes, 360 px), knowledge, audit
  - **Done when:** ACs marked `[x]`, audit.md written, status `done`. -- VERIFIED

## Requirements Coverage

| Requirement | Tasks |
| ----------- | ----- |
| AC-001, AC-002 | T001, T006 |
| AC-003–AC-005 | T002, T003 |
| AC-006–AC-008, AC-013, AC-014 | T002, T004 |
| AC-009–AC-012, AC-015 | T005 |
| AC-016, AC-017 | T006 |
