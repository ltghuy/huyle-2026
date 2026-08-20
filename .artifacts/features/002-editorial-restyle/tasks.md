---
id: 002
feature: editorial-restyle
created: 2026-08-14
---

> **⚠ PARTIALLY SUPERSEDED — 2026-08-20.** The nav-pill, Statement, token, and
> page-order tasks (T001–T003, T005, T009–T011, T013) are accurate. The
> hero-scene tasks are **not**: T004 (`HeroWordmark` scale prop), T006 (move
> `HeroExperience` into `Hero`), T007 (**pin** the hero — the shipped
> `HeroScrollSpine` deliberately does NOT pin), and T008 (`HeroPoster` no-WebGL
> path) describe code that shipped as a static `HeroPortrait` and was later
> removed. Treat them as historical. Current truth: the code + `.agents/knowledge.md`.

# Tasks: Editorial Re-style Layer

## Summary

Total: 14 | Completed: 14 | Remaining: 0

## Execution Plan

```
T001 ─┬─> T002 ──> T003                         (pill nav)
      ├─> T004 ─┐
      ├─> T005 ─┼─> T006 ─┬─> T007 ─┐
      │         │         └─> T008 ─┤
      └─> T009 ─┼───────────────────┼─> T010 ──> T011
                │                   │              │
                └─> T012 <──────────┘              ├─> T013
                                                   └─> T014 (final verify)
```

## Quality Gates

Run after each task or batch:

- `yarn lint`
- `yarn build` (typecheck + Next 16 build; must stay clean with `dynamic(ssr:false)` + r3f)
- `yarn test` (Vitest)
- Playwright E2E (`playwright.config.ts`) after T013

## Tasks

### Foundations — tokens

- [x] T001 [P] Add editorial type tokens + utilities to `src/app/globals.css`
  - Add `--text-hero: clamp(3.5rem, 13vw, 11rem)` (tracking `-0.03em`,
    line-height `0.9`); add hero-name + corner runner-label utility classes; bump
    `.display` weight `600 → 700`.
  - **Done when:** tokens compile; existing sections render unchanged except the
    heavier display weight; no raw hex introduced in components.

### Consolidated pill navigation

- [x] T002 [B:T001] Rework `src/components/layout/Nav.tsx` into one centered glass pill
  - Collapse the 3-column fixed bar into a single centered `.glass` rounded-full
    container: "Evan" mark + Work/About/Contact + résumé (kept hidden while
    `RESUME_URL` is null). Preserve `:focus-visible` rings and the scrim/scroll
    clearance so it never covers the hero identity text.
  - **Done when:** nav is a single centered floating control; all existing links
    present and resolve; keyboard-focusable; does not overlap the first heading at
    375/768/1024/1440. (AC-005, AC-006, AC-007)

- [x] T003 [B:T002] Extend nav tests (`src/components/layout/links.test.tsx` or new `Nav.test.tsx`)
  - **Done when:** tests assert a single nav control, every destination link is
    present and resolves, and links are focusable. (AC-007)

### Type-as-spine hero

- [x] T004 [P][B:T001] Add a hero-scale prop to `src/components/hero/HeroWordmark.tsx`
  - Accept size/scale so the wordmark can render at `--text-hero` scale; keep the
    intro-complete draw and reduced-motion static behavior.
  - **Done when:** wordmark renders at hero scale; still draws once after intro;
    static under reduced motion. (AC-001)

- [x] T005 [P][B:T001] Create `src/components/hero/Hero.tsx` (Server) with `id="hero"`
  - Oversized name (`HeroWordmark` + real `profile.display`/`title` text via
    `ScrambleText`), a CSS-grid stacking cell reserved for the scene, and four
    corner runner labels (`©2026`, `/ ENGINEERING SINCE {year}`, `HL`, monogram)
    marked `aria-hidden` where duplicative.
  - **Done when:** name renders as the dominant element; `id="hero"` exists;
    name/title are real SSR text (visible with JS off); runner labels present and
    `aria-hidden`. (AC-001, AC-003, AC-004, AC-014)

- [x] T006 [B:T005] Move the scene into `Hero`; reduce `About` to bio-only
  - Relocate `HeroExperience` + its `glow-blob` from `src/components/sections/About.tsx`
    into `Hero`, stacked above the wordmark in the same grid cell (scene layer `z`
    above name, glow below). `About` becomes a pure bio section.
  - **Done when:** exactly one scene instance exists; scene visibly overlaps the
    name on a capable device; `About` renders bio only. (AC-002)

- [x] T007 [B:T006] Create `src/components/hero/HeroScrollSpine.client.tsx` (pinned scrub)
  - Pin the single hero section and scrub headline `opacity/y` + subtle background
    parallax; gate entirely on `usePrefersReducedMotion()` + `useIntroComplete()`;
    call `ScrollTrigger.refresh()` after fonts/intro; wrap in `gsap.context()` and
    revert on unmount.
  - **Done when:** pin/scrub runs on capable devices; fully disabled under reduced
    motion (static hero); no leaked triggers on unmount; only one pinned section.
    (AC-002, AC-011)

- [x] T008 [B:T005] Fallback + CLS in `Hero`
  - When WebGL is unavailable/errors (reuse `useWebGLAvailable`), compose
    `HeroPoster` with the name in the same cell; reserve hero min-height and use
    `font-display: swap` so the oversized name doesn't reflow surroundings.
  - **Done when:** no-WebGL path shows poster + name (never an empty cell); no
    large layout shift as fonts/scene load. (AC-012, AC-015)

### Mission-statement beat

- [x] T009 [P][B:T001] Create `src/components/sections/Statement.tsx` (Server)
  - A single centered short statement (condensed from `profile.summary`), `h2`
    scale, generous vertical padding, revealed via `Reveal`.
  - **Done when:** one centered statement renders with generous negative space.
    (AC-008)

### Wire the page

- [x] T010 [B:T006,T009] Update `src/app/page.tsx` section order
  - New order: `Hero → About → Statement → WhatIDo → Experience → Work → Contact`.
  - **Done when:** DOM order matches; every pre-re-style section still present and
    readable. (AC-004, AC-008, AC-014)

### Editorial polish

- [x] T011 [B:T010] Display hierarchy + accent-discipline audit
  - Apply the heavier/tighter display treatment consistently across section
    headings; audit all sections so the lime accent appears only on
    emphasis/interaction/rim-light, never as broad fills.
  - **Done when:** headings read as one editorial system; no broad accent-fill
    regressions. (AC-009, AC-010)

### Tests & verification

- [x] T012 [B:T005,T007,T008,T009] Component tests
  - `Hero.test.tsx` (SSR name/title text, `id="hero"`, `aria-hidden` runners,
    poster path when WebGL unavailable), `HeroScrollSpine.test.tsx` (no pin under
    reduced-motion; cleanup on unmount), `Statement.test.tsx` (renders; in order).
  - **Done when:** all new component tests pass. (AC-001, AC-008, AC-011, AC-012)

- [x] T013 [B:T010] E2E `e2e/editorial.spec.ts`
  - `#hero` anchor scrolls to the hero; the name is the largest element on load;
    the pill nav does not overlap hero identity text; mobile viewport has no
    horizontal scroll.
  - **Done when:** the E2E spec passes on the built app. (AC-004, AC-006, AC-013)

- [x] T014 [B:T003,T011,T012,T013] Final quality gate + verify against ACs
  - `yarn lint` + `yarn build` + `yarn test` + Playwright all green; manual pass on
    reduced-motion, no-WebGL, and 375/768/1024/1440; run the spec-driven `verify`
    step and mark AC checkboxes in `spec.md`.
  - **Done when:** all gates pass; all in-scope ACs verified; `spec.md` ACs marked.
    (AC-011, AC-012, AC-013, AC-014, AC-015)

## Requirements Coverage

| Requirement | Tasks |
| ----------- | ----- |
| AC-001 | T004, T005, T012 |
| AC-002 | T006, T007 |
| AC-003 | T005 |
| AC-004 | T005, T010, T013 |
| AC-005 | T002 |
| AC-006 | T002, T013 |
| AC-007 | T002, T003 |
| AC-008 | T009, T010, T012 |
| AC-009 | T001, T011 |
| AC-010 | T011 |
| AC-011 | T007, T012, T014 |
| AC-012 | T008, T012, T014 |
| AC-013 | T013, T014 |
| AC-014 | T005, T010, T014 |
| AC-015 | T008, T014 |
