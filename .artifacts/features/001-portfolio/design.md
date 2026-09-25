---
id: 001
feature: portfolio
status: as-built
updated: 2026-09-25
---

# Design: Personal Portfolio (as-built architecture)

> Consolidated architecture map for the shipped site. This documents *what the
> code does today*, not a forward plan. Source of truth is the code +
> `.agents/knowledge.md`; update this map when the architecture changes.

## Architecture overview

A single-page Next.js 16 (App Router, Turbopack) site, statically/edge-rendered
and deployed to Cloudflare via OpenNext. Sections are Server Components; motion and
WebGL live in `"use client"` islands. Content is typed data under `src/content/`;
visual tokens live in `globals.css` (Tailwind v4 `@theme`) with no raw hex in
components.

### Page composition

`src/app/page.tsx` renders, in order:

1. `Hero` — editorial type-led opening
2. `About`
3. `Statement` — centered mission beat
4. `Gallery` — WebGL photo globe ("Off the clock")
5. `WhatIDo` — capabilities
6. `Experience` — work-history timeline
7. `Work` — spotlighted projects
8. `Contact`

## Component / concern map

| Concern | Where | Notes |
|---------|-------|-------|
| Opening panel (role spine, portrait, corner runners, sr-only h1) | `src/components/hero/Hero.tsx`, `HeroPortrait.tsx`, `HeroScrollSpine.client.tsx`, `HeroDoodles.client.tsx`, `ScrollPortrait.client.tsx` | Oversized `SOFTWARE ENGINEER` via `data-hero-title aria-hidden`; name in nav + `sr-only` h1. `HeroScrollSpine` is a no-pin parallax (not a ScrollTrigger pin — pinning fought downstream scroll). |
| Floating nav + language switcher | `src/components/layout/` (`Nav`, `LanguageSwitcher.client.tsx`) | Single centered glass pill; anchors resolve to real in-page sections. |
| Statement beat | `src/components/sections/Statement.tsx` | Centered single-line passage with generous space. |
| WebGL globe gallery | `src/components/sections/Gallery.client.tsx` + `GalleryScene.client.tsx` | `usePrefersReducedMotion` + `useWebGLAvailable` gate; `ScrollRow` fallback; `dynamic(ssr:false)` scene; `Globe`/`WireframeGlobe`/`GridFloor`/`DragController`/`CameraRig`; ripple + rounded-corner fragment shader; editorial overlay + `DragCue` SVG. |
| Capabilities / experience / work | `WhatIDo.tsx`, `Experience.tsx` + `SerpentineTimeline.client.tsx` / `ExperienceGrid*.tsx`, `Work.tsx` | Scroll-reveal on view. Work uses a section-owned-height pinned inner-wrapper pattern (see knowledge.md pin gotcha). |
| Contact | `Contact.tsx`, `EmailActions.client.tsx` | Email link + social profile links; no-dead-control policy (résumé hidden until a PDF exists). |
| Content model | `src/content/*.ts` | `profile`, `experience`, `projects`, `skills`, `socials`, `gallery`; `vi.ts` overlays Vietnamese prose over the English source. |
| i18n runtime | `src/lib/i18n/LocaleProvider.client.tsx` | Locale context + persistence; `LanguageSwitcher` toggles en/vi. |
| Tokens / fonts | `src/app/globals.css`, `src/app/layout.tsx` | dark green `#0b1510` + lime `#d7f24a`; Fredoka display / Inter body / JetBrains Mono runner labels (via `next/font`, preloaded for CLS). |

## Key decisions & rationale

- **Static hero, no 3D scene.** The interactive 3D character/cat hero (old 001) and
  the Meshy pipeline were removed; the hero is a static portrait straddling the
  oversized role type. 001's "interactive 3D" ACs are retired.
- **Progressive enhancement everywhere.** The only WebGL surface (the gallery)
  mounts client-only (`ssr:false` inside a Client Component — Next 16 forbids
  `ssr:false` in Server Components) and gates on WebGL + motion, falling back to a
  native scroll-snap row.
- **Scroll motion without hijacking.** GSAP/ScrollTrigger drive reveals and the hero
  parallax; native scroll is preserved for a11y. Multi-step pinned scrubs give the
  section a real height and pin an inner wrapper with `pinSpacing:false` to avoid the
  Strict-Mode pin-spacer collapse (see knowledge.md).
- **i18n by overlay.** Vietnamese content spreads the English item so structural
  fields stay shared and only prose diverges; arrays stay index-aligned.

## Non-functional requirements (as-built)

- **a11y:** keyboard-reachable nav with visible focus; `sr-only` h1 for identity;
  all images carry `alt`; decorative scene/labels don't trap focus; reduced-motion
  disables the intro overlay, scroll motion, and the WebGL scene.
- **Performance / GPU hygiene:** one shared tile geometry; geometries/materials
  disposed on unmount; no allocation in the render loop (reused scratch vectors);
  fonts preloaded with metric fallbacks to keep CLS minimal.
- **SSR:** the page prerenders static; only the gallery scene is excluded from SSR.
- **Color fidelity:** photo textures shown as-authored (`NoColorSpace`, no lighting).

## Cross-references

- `.agents/knowledge.md` — cross-feature decisions & gotchas (authoritative for
  deviations, the pin-spacer gotcha, the `text-base` landmine, the palette/type
  divergence history).
- `inputs/` — original brief materials: `content/about-me.md`, `idea/concept.md`,
  `reference-sites/sites.md`, `style/editorial-layer.md`, and reference photos.
