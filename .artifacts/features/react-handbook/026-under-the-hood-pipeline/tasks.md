---
id: 026
feature: under-the-hood-pipeline
created: 2026-10-13
---

# Tasks: Under the Hood section + "From source to bundle"

## Summary

Total: 8 | Completed: 8 | Remaining: 0

## Execution Plan

```
T001 --> T002 --> T003 --> T004 --> T005 --> T006 --> T007 --> T008
                   (demos T003-T007 depend on T002's page shell)
```

## Quality Gates

Run after each task or batch:

- pnpm lint
- pnpm typecheck
- pnpm build (after T002, T007, T008)

## Tasks

### Section

- [x] T001 Add the `under-the-hood` section: catalog (section, path, 5 pages), icon, sidebar folder, section route, fallback route for unwritten pages, home copy + references, README row
  - **Done when:** home shows the card "1 of 5 pages written"; `/under-the-hood` lists 5 pages; an unwritten page URL renders a placeholder, not 404; sidebar shows the folder

### Page

- [x] T002 [B:T001] Page route + `content.tsx` with intro, Toc and five Topics (text, advice, links); add shadcn Tabs; shared `CodePanel` + `sizes.ts`
  - **Done when:** `/under-the-hood/build-pipeline` renders five numbered topics with placeholder-free text

- [x] T003 [B:T002] Toolchain explorer (toolchains.ts + toolchain-demo.tsx)
  - **Done when:** AC-004..006 observable in browser; no horizontal scroll at 360 px

- [x] T004 [B:T002] Pipeline stepper (sample.ts + stages-demo.tsx)
  - **Done when:** AC-007..010 observable; sizes computed live

- [x] T005 [B:T004] Dev vs prod demo (modes-demo.tsx)
  - **Done when:** AC-011..012 observable

- [x] T006 [B:T002] Content-hash demo (hashing.ts + hashing-demo.tsx) with scratch logic check
  - **Done when:** AC-013..014 observable; scratch script scenarios pass

- [x] T007 [B:T002] What this page loaded (loaded-demo.tsx)
  - **Done when:** AC-015..016 observable on `pnpm start`

### Verify

- [x] T008 [B:T003-T007] Full verification: quality gate, axe light/dark, 360 px, keyboard; knowledge.md entries
  - **Done when:** all ACs marked `[x]` with evidence

## Requirements Coverage

| Requirement | Tasks |
| ----------- | ----- |
| AC-001..003 | T001, T008 |
| AC-004..006 | T003 |
| AC-007..010 | T004 |
| AC-011..012 | T005 |
| AC-013..014 | T006 |
| AC-015..016 | T007 |
