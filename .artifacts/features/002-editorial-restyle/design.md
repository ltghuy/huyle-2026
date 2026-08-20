---
id: 002
feature: editorial-restyle
created: 2026-08-14
---

> **⚠ PARTIALLY SUPERSEDED — 2026-08-20.** The nav pill, Statement, `.display`
> 600→700, `--text-hero` clamp, and palette reconciliation (green/lime/Fredoka)
> below are accurate. The **hero-composition core is not** — mounting
> `HeroWordmark` and composing `HeroExperience`(+`HeroPoster`) "over the name"
> with a pinned `HeroScrollSpine` never shipped: the hero is a static
> `HeroPortrait` below the type, `HeroScrollSpine` is a **no-pin** parallax, and
> `HeroExperience`/`HeroWordmark`/`HeroPoster`/`useScrollProgress` were later
> removed. Treat those rows/decisions/traceability entries as historical. Current
> truth: the code + `.agents/knowledge.md`.

# Technical Design: Editorial Re-style Layer

## Scope

**In scope:** a new type-as-spine `Hero` band that wires up the orphaned
`HeroWordmark` + the (currently dead) `#hero` anchor and composes the existing
`HeroExperience` scene *over* the oversized name; corner "runner" labels; a
consolidated centered glass **pill** `Nav`; a centered `Statement` beat between
Hero and `WhatIDo`; a display-scale/weight bump in `globals.css`; accent-discipline
audit. All within the **live** dark-green + lime + Fredoka system.

**Out of scope:** palette/font swaps, new scene assets, new content, any change to
`Experience`/`Work`/`Contact` internals beyond the shared display-type tokens.

> **Source of truth = code.** Older prose docs (`spec.md`/`style-guide.md`) say
> navy+teal+Space Grotesk; the shipped tokens are green `#0b1510` + lime `#d7f24a`
> + Fredoka. See `.agents/knowledge.md` → Gotchas. This design uses the live tokens.

## Research Summary

> From `ui-ux-pro-max` (2026-08-14), captured in
> `features/001-3d-portfolio/inputs/style/editorial-layer.md` and reference analysis
> in `.../inputs/reference-sites/sites.md`.

- **"Exaggerated Minimalism"** style: oversized type `clamp(3rem,10vw,12rem)`,
  extreme whitespace, **single accent only** → maps to lime-on-green.
- Keep the single dominant grotesk (here Fredoka); push **size + weight + tracking**,
  not a new face. Fredoka caps at **700** — no fake 900.
- GSAP presets: **pinned scroll-reveal (scrub)** for the hero spine (pin ≤1–2
  sections, `ScrollTrigger.refresh()` after fonts load), optional **SplitText**
  char-stagger (Club plugin → needs fallback), **subtle parallax** for decorative
  layers only. All gated by `prefers-reduced-motion`.

## Patterns & Reuse

### Conventions to Follow

| Pattern | Project Uses | Avoid | Reference |
|---------|-------------|-------|-----------|
| Styling tokens | Tailwind v4 `@theme` vars; utility classes `.display`/`.eyebrow`/`.glass` | Raw hex in components | `src/app/globals.css:1` |
| Server vs client | Sections are Server Components; motion/3D are `"use client"` islands | `"use client"` on a whole section | `src/components/sections/About.tsx:1` |
| Reduced motion | `usePrefersReducedMotion()` + global reduced-motion CSS | Ungated GSAP | `src/lib/usePrefersReducedMotion.ts`, `globals.css` reduced block |
| Scroll progress | Shared `useScrollProgress` scrubber (NOT drei `ScrollControls`) | Hijacking native scroll | `src/lib/useScrollProgress.ts` |
| Intro gating | `useIntroComplete()` defers hero draw until intro reveals | Animating before intro done | `src/lib/useIntroComplete.ts` |
| Content | Typed modules under `src/content/` | Hardcoded copy in JSX | `src/content/profile.ts` |
| GSAP | Free (incl. ScrollTrigger/ScrambleText); wrap in `gsap.context()`, revert on unmount | Leaking triggers | `.agents/knowledge.md` |

### Existing Code to Reuse

| Component | Location | How to Use |
|-----------|----------|------------|
| `HeroWordmark` | `src/components/hero/HeroWordmark.tsx` | **Mount it** — currently orphaned; it's the oversized name (draws the "Evan" monoline once intro completes) |
| `HeroExperience` (+`HeroPoster`) | `src/components/hero/HeroExperience.client.tsx`, `hero/HeroPoster.tsx` | Compose over/behind the wordmark; poster is the no-WebGL fallback (AC-012) |
| `.display` / `.eyebrow` / `.glass` | `src/app/globals.css` | Base type + pill surface; extend `.display` scale, add hero-scale + runner-label utilities |
| `ScrambleText` | `src/components/motion/ScrambleText.tsx` | Existing decode effect for the hero eyebrow/title; SplitText is optional enrichment, not a replacement |
| `Reveal` / `usePrefersReducedMotion` | `src/components/motion/Reveal.tsx`, `src/lib/…` | Reveal the Statement beat; gate all new motion |
| `profile` | `src/content/profile.ts` | `display`, `title`, `monogram`, `summary` for name, runner labels, statement copy |

## Data Model

No new persisted entities. Reused content fields:

#### `profile` (`src/content/profile.ts`)

- `display` (string) — the hero name / brand → `profile.ts:34`
- `title` (string) — hero eyebrow/subtitle → `profile.ts:35`
- `monogram` (string, "HL") — a corner runner label → `profile.ts:40`
- `summary` (string) — source to condense into the Statement copy → `profile.ts:36`

New static, presentational constants (no schema): runner-label strings (year,
"ENGINEERING SINCE {year}") — colocated in the `Hero` component or a small
`src/content/hero.ts` if reused. "Since" year is an Open Question (default 2021).

### Currently Exposed Fields

| AC ID | Field | Source (file:line) | Currently Exposed? | Gap? |
|-------|-------|--------------------|--------------------|------|
| AC-001 | `profile.display` | `src/content/profile.ts:34` | yes (used in Nav aria) | none — render at hero scale |
| AC-003 | `profile.monogram` | `src/content/profile.ts:40` | yes (nav) | none |
| AC-003 | runner "since" year | none | no | must add (static const) |
| AC-008 | statement copy | derived from `profile.summary:36` | partial | must condense to 1–2 lines |

## Decisions

| Decision | Rationale |
|----------|-----------|
| Add a dedicated `Hero` Server Component rendered **first** in `page.tsx`, `id="hero"` | Fixes the dead `#hero` anchor (AC-004); gives the type-as-spine its own band separate from `About` |
| Keep the bio in `About`; **remove the 3D from `About`** and move `HeroExperience` into `Hero` | The scene belongs to the name statement now; avoids two scene instances |
| Compose name + scene with CSS grid **stacking (same cell)**, scene layer `z` above wordmark, ambient `glow-blob` below | Achieves overlap (AC-002) without canvas rework; poster swaps in at the same layer for fallback (AC-012) |
| Hero motion = **pinned scroll-reveal (scrub)**, single pinned section, gated by reduced-motion + intro-complete | Matches reference cadence; respects "pin ≤1–2" and nausea guardrails (AC-011) |
| **Defer SplitText**; reuse `ScrambleText` for the decode | Avoids a Club-plugin dependency; scramble already ships and satisfies the effect |
| Rework `Nav` into one centered `.glass` **pill** (grid → single rounded container) | AC-005; reuse existing glass token, links, résumé-hidden policy |
| Bump `.display` weight 600 → **700** and add a `--text-hero` clamp; reserve accent for emphasis only | AC-009/AC-010 editorial hierarchy within existing font |
| Static-first hero markup (name/title as real text, wordmark drawn client-side) | Keeps SSR/no-JS/screen-reader content intact (AC-014, edge cases) |

## Component Design

| Component | File | Action | Responsibility |
|-----------|------|--------|----------------|
| `Hero` | `src/components/hero/Hero.tsx` | **new** (Server) | The type-as-spine band: `id="hero"`, oversized `HeroWordmark`, eyebrow/title (`ScrambleText`), corner runner labels, and `HeroExperience` overlapping the name |
| `HeroRunners` | inline in `Hero.tsx` (or `hero/HeroRunners.tsx`) | **new** | The four corner labels (`aria-hidden` where duplicative), optional subtle parallax layer |
| `HeroScrollSpine` | `src/components/hero/HeroScrollSpine.client.tsx` | **new** (client) | Wraps the Hero visuals; sets up the pinned scrub timeline, gated by `usePrefersReducedMotion` + `useIntroComplete`; `ScrollTrigger.refresh()` after fonts ready |
| `HeroWordmark` | `src/components/hero/HeroWordmark.tsx` | **modify** | Accept a size/scale prop for hero-scale rendering (still draws on intro-complete) |
| `About` | `src/components/sections/About.tsx` | **modify** | Remove embedded `HeroExperience` + its glow; becomes a pure bio section |
| `Nav` | `src/components/layout/Nav.tsx` | **modify** | Collapse 3-col fixed bar → one centered floating `.glass` pill; keep links, mark, résumé policy, focus rings |
| `Statement` | `src/components/sections/Statement.tsx` | **new** (Server) | Centered short mission passage; `Reveal`-animated; placed between Hero and `WhatIDo` |
| `page.tsx` | `src/app/page.tsx` | **modify** | New order: `Hero → About → Statement → WhatIDo → Experience → Work → Contact` |
| tokens | `src/app/globals.css` | **modify** | Add `--text-hero` clamp + hero/runner utilities; `.display` weight → 700 |

## Visual Design Considerations

Key patterns (from `editorial-layer.md`):
- **Type-as-spine:** hero name `clamp(3.5rem,13vw,11rem)`, tracking `-0.03em`,
  line-height `0.9`; scene subject in front with a **lime rim-light** for
  separation; ambient `glow-blob` behind.
- **Runner labels:** `.eyebrow`-style JetBrains Mono, `--color-fg-subtle`, pinned to
  hero corners (`©2026` / `/ ENGINEERING SINCE 2021` / `HL`).
- **Pill nav:** `.glass` rounded-full container, centered, mark + links + résumé;
  must clear the hero identity text (respect `section[id]{scroll-margin-top}`).
- **Statement beat:** single centered sentence, `h2` scale, `--color-fg`, large
  vertical padding.
- **Accent discipline:** lime only on emphasis/interaction/rim-light.

## Data Flow

1. `RootLayout` renders `IntroOverlay` + `Nav` (pill) + `page`.
2. `page` renders `Hero` first (`id="hero"`).
3. `Hero` renders oversized `HeroWordmark` (static/drawn) with `HeroExperience`
   stacked above in the same grid cell; `HeroScrollSpine` pins + scrubs on scroll.
4. `useIntroComplete` gates wordmark draw; `usePrefersReducedMotion` / no-WebGL
   switch to static wordmark + `HeroPoster`.
5. Scroll → `Statement` beat → existing sections unchanged.

## Requirements Traceability

| Requirement | Component | File | Status |
|-------------|-----------|------|--------|
| AC-001 | `Hero` + `HeroWordmark` | `hero/Hero.tsx`, `hero/HeroWordmark.tsx` | Planned |
| AC-002 | `Hero` grid stacking + `HeroExperience` | `hero/Hero.tsx` | Planned |
| AC-003 | `HeroRunners` | `hero/Hero.tsx` | Planned |
| AC-004 | `Hero` `id="hero"` + `Nav` | `hero/Hero.tsx`, `layout/Nav.tsx` | Planned |
| AC-005 | `Nav` pill | `layout/Nav.tsx` | Planned |
| AC-006 | `Nav` layout + hero spacing | `layout/Nav.tsx`, `globals.css` | Planned |
| AC-007 | `Nav` links/focus | `layout/Nav.tsx`, `layout/links.test.tsx` | Planned |
| AC-008 | `Statement` | `sections/Statement.tsx`, `page.tsx` | Planned |
| AC-009 | `.display` scale/weight | `globals.css` | Planned |
| AC-010 | accent audit | all sections (review) | Planned |
| AC-011 | `HeroScrollSpine` reduced-motion gate | `hero/HeroScrollSpine.client.tsx` | Planned |
| AC-012 | `HeroPoster` fallback in `Hero` | `hero/Hero.tsx`, `hero/HeroPoster.tsx` | Planned |
| AC-013 | responsive hero/nav/statement | `Hero.tsx`, `Nav.tsx`, `Statement.tsx` | Planned |
| AC-014 | content preserved | `page.tsx`, `About.tsx` | Planned |
| AC-015 | CLS: reserve hero space, font-display | `Hero.tsx`, `globals.css` | Planned |

## Test Strategy

### Infrastructure

| Aspect | Detail |
|--------|--------|
| Unit/component | Vitest + Testing Library (`vitest.config.mts`, `*.test.tsx`) |
| E2E | Playwright (`e2e/`, `playwright.config.ts`) |
| Commands | `yarn test` (vitest), `yarn build`, `yarn lint`, Playwright run |

### Reference Tests

| File | What It Tests |
|------|---------------|
| `src/components/layout/links.test.tsx` | Nav links resolve — extend for the pill |
| `src/components/motion/ScrambleText.test.tsx` | Decode effect + reduced-motion gate — pattern for hero |
| `src/content/content.test.ts` | Content integrity — guards AC-014 |

### New Tests

| Component | Test File | Scenarios |
|-----------|-----------|-----------|
| `Nav` (pill) | `layout/Nav.test.tsx` (or extend `links.test.tsx`) | Single centered control; all links present + resolve; focusable |
| `Hero` | `hero/Hero.test.tsx` | Renders name/title text (SSR/no-JS); `id="hero"` present; runner labels `aria-hidden`; poster path when WebGL unavailable |
| `HeroScrollSpine` | `hero/HeroScrollSpine.test.tsx` | No pin/scrub when reduced-motion; timeline cleaned up on unmount |
| Statement | `sections/Statement.test.tsx` | Renders single statement; present in DOM order between Hero and WhatIDo |
| E2E | `e2e/editorial.spec.ts` | `#hero` anchor scrolls to hero; name is largest; nav doesn't overlap hero text; mobile no horizontal scroll |

## Considerations

### Error Handling

- No-WebGL / scene error → `HeroPoster` composes with the name (reuse 001's
  `useWebGLAvailable` path); never an empty hero cell.
- Late fonts → reserve hero min-height + `font-display: swap` to bound CLS (AC-015).
- `ScrollTrigger` needs deterministic height → `refresh()` after fonts/intro; pin
  only the single hero section.

### Security

- None new — static presentational change, no inputs, no network.

### Accessibility (carried from 001, must not regress)

- Real text for name/title/statement; canvas + runner labels `aria-hidden`.
- Pill `Nav` is a real `<nav>`, keyboard-operable, `:focus-visible` ring intact,
  not covering the first heading.
- All new motion gated by `prefers-reduced-motion`.

## Open Questions

- [ ] "ENGINEERING SINCE {year}" — confirm the year (default 2021 from 4+ yrs exp).
- [ ] Smallest-screen nav: keep 3 links inline vs. collapse one — decide against
      44px touch-target + no-obscure rules during implementation.
- [ ] Hero name at hero scale: render the "Evan" monoline wordmark, the literal
      "HUY LE" display text, or both stacked — resolve in T-hero build (wordmark is
      the current brand; literal text is the most SEO/a11y-robust).
