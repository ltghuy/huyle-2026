---
id: "001"
feature: practice-playground
created: 2026-10-06
---

# Tasks: React Practice Playground (Shell)

## Summary

Total: 11 | Completed: 11 | Remaining: 0

## Execution Plan

```
T001 ──┐
       ├──> T003 ──> T004 ──> T005 ──> T006
T002 ──┘               │        │
                       │        └──> T007 ──> T008 ──> T009 ──> T011
                       └──> T010 ─────────────────────────────────┘
```

- T001 and T002 are parallel (theme vs data).
- T010 (filter) only needs the nav (T004) and can run alongside T005–T009.
- T011 closes the open question from design.md and needs everything else.

## Quality Gates

Run after each task or batch:

- `pnpm lint`
- `pnpm typecheck`
- `pnpm build` (end of each group)

## Tasks

### Foundations: theme fixes + practice catalog

- [x] T001 [P] Fix theme and root layout: OS-driven dark mode, `--font-sans` → Geist, `--success` token (both themes), global reduced-motion rule, root metadata `title.template`, body background
  - **Done when:** with the OS in dark mode the page renders dark tokens; computed body font is Geist; the `--success` foreground/background pair is ≥4.5:1 in both themes; `prefers-reduced-motion` sets transition/animation durations to ~0. -- VERIFIED

- [x] T002 [P] Create the practice catalog with all 14 entries (slug, number, title, summary), `getPractice`, `isBuilt`, `builtCount`, and the `PracticeModule` type
  - **Done when:** the catalog type-checks, slugs are unique kebab-case, and the order matches the spec list. -- VERIFIED

### Playground shell: sidebar, layout, overview

- [x] T003 [B:T001] Add shadcn sidebar primitives via CLI (`sidebar` and its dependencies)
  - **Done when:** the generated files exist unmodified and the build passes. -- VERIFIED

- [x] T004 [B:T002,T003] Build StatusBadge, AppSidebar (brand + built count) and PracticeNav (numbered links, active state + `aria-current`, truncation with full title, drawer closes on select)
  - **Done when:** the sidebar lists 14 items in order; the current item is highlighted and announced as the current page; every item is reachable by Tab with a visible focus ring; unbuilt items show "Coming soon". -- VERIFIED

- [x] T005 [B:T004] Create the `(playground)` layout (SidebarProvider + AppSidebar + SidebarInset) and MobileTopBar; remove the default home page
  - **Done when:** below `md` the sidebar is hidden behind a labelled menu button that opens a drawer (focus moves in, Escape/outside click closes, focus returns); at ≥`md` the sidebar is persistent; there's no horizontal scroll at 360px. -- VERIFIED

- [x] T006 [B:T005] Build the overview page: heading, "N of 14 built", responsive card grid with title, summary and status, each card linking to its practice
  - **Done when:** `/` shows 14 cards in 1/2/3 columns by width; clicking a card opens that practice's URL. -- VERIFIED

### Practice route and frame

- [x] T007 [B:T005] Build DemoControls (labelled region) and DemoStage (bordered region wrapped in a `catchError` boundary with message + Retry)
  - **Done when:** a child that throws inside DemoStage renders the fallback while everything outside it stays interactive, and Retry re-renders the children. -- VERIFIED

- [x] T008 [B:T002,T007] Build PracticeFrame (header: number, title, summary, status → Explanation card → Demo with `key={slug}`) and PracticePlaceholder
  - **Done when:** an unbuilt practice renders header + placeholder; a built one renders header → explanation → controls (only if provided) → stage, in that order. -- VERIFIED

- [x] T009 [B:T008] Create `/practices/[slug]` page (`generateStaticParams`, `generateMetadata`, `notFound()`), its `error.tsx` backstop (`retry`), and the group `not-found.tsx`
  - **Done when:** the build prerenders 14 practice routes; the tab title is "{Practice} · React Practices"; `/practices/nope` returns 404 with the sidebar visible and a link to the overview; refresh and back/forward keep the right practice. -- VERIFIED

### Sidebar filter

- [x] T010 [B:T004] Add a case-insensitive filter above the nav list, with a "No matches" state and a Clear button
  - **Done when:** typing "modal" shows only "Accessible Modal"; typing "zzz" shows "No matches" and Clear restores all 14. -- VERIFIED

### Validation of open design question

- [x] T011 [B:T009,T010] Probe lazy loading and the demo boundary with a temporary practice (one module with a throwing toggle), then remove it
  - **Done when:** in a production build the probe's client chunk is requested only when its page opens; the forced error stays inside the demo area; the probe is deleted and the catalog shows 0 built again. If the chunk loads eagerly, apply the fallback from design.md and record it in decisions. -- VERIFIED

## Requirements Coverage

| Requirement | Tasks |
| ----------- | ----- |
| AC-001 | T002, T004 |
| AC-002 | T005 |
| AC-003 | T004 |
| AC-004 | T004, T008 |
| AC-005 | T004 |
| AC-006 | T009 |
| AC-007 | T009 |
| AC-008 | T009 |
| AC-009 | T001, T009 |
| AC-010 | T008 |
| AC-011 | T007, T008 |
| AC-012 | T002, T009, T011 |
| AC-013 | T007, T009, T011 |
| AC-014 | T006 |
| AC-015 | T006 |
| AC-016 | T002, T006 |
| AC-017 | T005 |
| AC-018 | T003, T005 |
| AC-019 | T004 |
| AC-020 | T005 |
| AC-021 | T010 |
| AC-022 | T010 |

## Implementation Notes

- T011 found eager loading: a single `[slug]` page with lazy server-side `import()` still emitted every practice's client chunk as a `<script>` on every practice page, and on all pages once the layout touched the loader map. Applied the design fallback: one route file per built practice. See design.md "Deviations".
- T010 was built together with T004 (same component) and verified separately.
