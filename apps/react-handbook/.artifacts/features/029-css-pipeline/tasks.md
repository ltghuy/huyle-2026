---
id: 029
feature: css-pipeline
created: 2026-10-13
---

# Tasks: The CSS pipeline

## Summary

Total: 6 | Completed: 6 | Remaining: 0

## Execution Plan

```
T001 --> T002 --> T003 --> T004 --> T005 --> T006
```

## Quality Gates

- pnpm lint / pnpm typecheck / pnpm build; scratch tool checks

## Tasks

- [x] T001 Dependencies (postcss, tailwindcss to deps), generated Tailwind theme, Sass stand-in + scratch check vs Dart Sass
  - **Done when:** all Sass samples match Dart Sass
- [x] T002 PostCSS plugins/adapter, CSS Modules plugin, Tailwind runner + scanner (scratch checks in node)
  - **Done when:** expected outputs in node
- [x] T003 Route, catalog, content; DeliveryDemo
  - **Done when:** AC-001..002 observable
- [x] T004 SassDemo + PostcssDemo
  - **Done when:** AC-003..007 observable
- [x] T005 ModulesDemo + TailwindDemo
  - **Done when:** AC-008..011 observable
- [x] T006 Verify (gate, axe, 360 px, keyboard), knowledge, audit
  - **Done when:** all ACs `[x]`

## Requirements Coverage

| Requirement | Tasks |
| --- | --- |
| AC-001..002 | T003 |
| AC-003..005 | T002, T004 |
| AC-006..007 | T001, T004 |
| AC-008..009 | T002, T005 |
| AC-010..011 | T002, T005 |
