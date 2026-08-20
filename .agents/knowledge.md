# Project Knowledge

Cross-feature decisions, gotchas, and codebase discoveries. Owned by spec-driven.

## Decisions

- **[001] Dark single-accent visual system.** Tokens in `src/app/globals.css`
  (Tailwind v4 `@theme`), no raw hex in components. ⚠ **The shipped palette/fonts
  differ from the older prose docs** — see the divergence Gotcha below. Live:
  dark green `#0b1510` + **lime** `#d7f24a`; **Fredoka** display (keyed to the
  "Evan" monoline wordmark) / Inter / JetBrains Mono.
- **[002] Editorial re-style layer (DONE 2026-08-14).** Additive layout-only pass
  over the live build (kept dark green + lime + Fredoka): type-as-spine `Hero`
  (wired up the orphaned `HeroWordmark` + dead `#hero` anchor), corner runner
  labels, single centered glass pill `Nav`, centered `Statement` beat, `.display`
  600→700 + `--text-hero`. Adapts editorial patterns from
  `majd-portfolio.framer.website`. Scene moved out of `About` into `Hero`.
  **Deviation from design:** `HeroScrollSpine` uses a subtle no-pin parallax, NOT
  a ScrollTrigger pin — pinning would shift downstream scroll positions and fight
  the scene's existing `useScrollProgress` staging. All 001 a11y / reduced-motion /
  3D-fallback guarantees preserved (verified: 22 unit + 8 e2e green).
- **[002] Hero recomposed to mirror Majd (2026-08-14, user-directed).** Pivot from
  the earlier draft:
  - **Spine = the ROLE**, not the name/wordmark: oversized two-line `SOFTWARE
    ENGINEER` (`.display-hero`, off-white) via `<p data-hero-title aria-hidden>`.
    The **"Evan" wordmark was dropped from the hero** (kept in the nav logo + intro
    animation per the user — do NOT remove it there). `HeroWordmark.tsx` is now
    unused/orphaned again (left in place, harmless).
  - **Name lives in the nav + an `sr-only` h1** (`{display} — {title}`) for SEO /
    no-JS / screen readers. The visible center identity block (eyebrow, subtitle,
    tagline) and the top-left `HL` runner were **removed**; only the `©2026` and
    `/ Engineering since 2021` corner runners remain (hidden `<sm` to avoid
    colliding with the portrait).
  - **Interim portrait** (`public/assets/evan.png`, from `inputs/character-image/`,
    downscaled to 700px) via `HeroPortrait`, pulled up (`-mt-8 sm:-mt-16`) to
    straddle the lower line of `ENGINEER` — tuned so letter-tops stay visible
    (nothing obscured). It **replaces** the live 3D `HeroExperience` for now; swap
    `<HeroPortrait/>` → `<HeroExperience/>` in `Hero.tsx` when the real Meshy model
    lands. Consequence: hero has no `<canvas>`, so 001 "interactive 3D" ACs are
    dormant by explicit user choice.
  - **Spec impact:** 002 AC-001 ("name is the single largest element") now reads as
    the *role* being largest with the name accessible via nav + h1 — an intentional
    user-directed deviation, not a regression.
  - No chrome/star/lightning props (user omitted them).
- **[002] E2E must wait out the intro overlay.** `IntroOverlay` sets `#site-content`
  to `autoAlpha:0` (visibility:hidden → out of the a11y tree) for ~4–5s, so
  `getByRole` on hero content races Playwright's 5s timeout under normal motion.
  Fix: after `goto`, press a key (triggers intro skip) then `waitForFunction`
  `window.__introComplete === true || overlay gone`. See `e2e/editorial.spec.ts`
  `gotoReady()`; `home.spec.ts` got the same wait.
- **[001] 3D via react-three-fiber, fixed Canvas behind DOM, scroll-progress store.**
  Scene staging is driven by a shared scroll scrubber, NOT drei `ScrollControls`
  (which would hijack native scroll and hurt a11y). Bông = hero cameo only.
- **[001] Placeholder-first 3D.** Ship on a CC0 rigged GLB; swap real assets via
  `src/content/scene.ts` path + clip map. Keeps build unblocked (AC-008).
- **[001] Hero-mounted 3D scene (v1).** The Canvas lives inside the Hero section
  (scrolls away), not a full-page fixed canvas. Simpler + keeps other sections
  clean 2D. Full-page fixed staging is a deferred enhancement.
- **[001] No-dead-control policy.** Ship affordances only when functional: the
  résumé link is hidden until a PDF exists; the sound toggle was removed until
  audio exists. Consistent, honest UI.
- **[cleanup 2026-08-20] 3D hero + Meshy pipeline removed.** The interactive
  `Scene` (character/cat/desk models), `HeroExperience`/`HeroPoster`,
  `HeroWordmark`, `RollingText`, `useScrollProgress`, `content/scene.ts`,
  `scripts/meshy.mjs`, `MESHY_API_KEY`, and `public/assets/models/` were all
  deleted. The hero is the static `HeroPortrait`; the gallery is the WebGL
  wireframe photo globe (`GalleryScene.client.tsx`). Earlier [001]/[002] notes
  about the live 3D scene, the Meshy swap, and `useScrollProgress` staging are
  historical only.

## Gotchas

- **⚠ Docs vs. code palette divergence.** `inputs/style/style-guide.md`,
  `spec.md`, and `inputs/style/tokens.css` describe *navy + teal + Space Grotesk*.
  The **shipped build** (`src/app/globals.css`, `layout.tsx`) is **dark green
  `#0b1510` + lime `#d7f24a` + Fredoka**, keyed to the "Evan" wordmark. **Code is
  the source of truth.** When any doc says teal→read lime, navy→green, Space
  Grotesk→Fredoka. (Recorded 2026-08-14 during 002 planning.)
- **`HeroWordmark` is defined but never rendered**, and the nav's `#hero` anchor
  targets nothing — the page opens directly into the `About` section. Feature 002
  wires up a real hero band using both.
- **Next.js 16: `ssr:false` with `next/dynamic` is forbidden in Server Components.**
  Must be inside a Client Component (docs `node_modules/next/dist/docs/01-app/02-guides/lazy-loading.md:94`).
  r3f `<Canvas>` therefore needs a `"use client"` wrapper doing `dynamic(import, {ssr:false})`.
- **AGENTS.md is regenerated by `next dev`.** It warns Next 16 has breaking changes;
  read `node_modules/next/dist/docs/` before writing Next code. Committing the block
  with your work keeps the tree clean.
- **GSAP is now fully free** (incl. ScrollTrigger + ScrambleTextPlugin) — safe to use.
- **⚠ ScrollTrigger auto pin-spacer can collapse to 0 (next section overlaps).**
  Under ScrollSmoother + React Strict Mode (Next dev double-invokes effects), a
  `pin:true` trigger whose spacer isn't fully reverted between invokes stacks a
  second nested pin-spacer and pin-spacing collapses to `0px` — the next section
  then overlaps and the scrub range shrinks (symptom: only the first 1-2 stacked
  cards are reachable). The Gallery's single auto-pin happens to survive; the Work
  deck did not. **Robust pattern for multi-step pinned scrubs:** give the SECTION a
  real height (`n × 100vh`) and pin an INNER wrapper with `pinSpacing:false` +
  `end:"bottom bottom"` — the section owns the scroll distance, so no auto-spacer is
  created to miscompute, and nothing below can overlap. Also kill any pre-existing
  trigger on the element at effect start (`ScrollTrigger.getAll().forEach(t => t.trigger===el && t.kill())`).
  See `Work.tsx` (Scroll Stack Cards, 2026-08-16).
- **`lucide-react` v1 removed brand logos** (LinkedIn/GitHub/Instagram/Facebook, etc.) for trademark reasons — only generic icons remain (Mail, Volume2, FileText…). Brand marks live as inline SVG in `src/components/icons/BrandIcons.tsx` (simple-icons paths, `currentColor`).
- **`@react-three/fiber` v9 augments the global JSX namespace** with three.js elements. This breaks polymorphic components that render a variable `as?: ElementType` tag (TS infers children as `never`; `createElement` then trips the new `react-hooks/refs` lint). Fix: render a concrete element (`<span>`/`<div>`) — that's what `ScrambleText`/`Reveal` now do.
- **drei `<Environment preset=...>` fetches an external HDR at runtime** (CDN). Avoided in the hero `Scene` — using explicit lights only keeps it self-contained/offline-safe.
- **Next 16 build is clean with `dynamic(ssr:false)` + r3f** — the Canvas is correctly excluded from SSR and the page still prerenders static.
- **⚠ `text-base` is a landmine — it paints text invisible.** The theme defines a
  `--color-base` token (`#0b1510`, the page bg), so in Tailwind v4 `text-base`
  resolves to `color: var(--color-base)` (the color utility), NOT the `1rem`
  font-size — and when it sits in a `@media` (`sm:text-base`) it wins over an
  earlier `text-fg-muted`, so the text renders in the page's background color and
  disappears. Symptom: text is fine `<sm` then vanishes at `≥sm`. **Never use
  `text-base`/`sm:text-base` for sizing — use an explicit size** (`text-[1rem]`,
  `text-[1.0625rem]`). Bit `Work.tsx` (project card description) and
  `Experience.tsx` (intro line); both fixed 2026-08-16. `bg-base`/other `*-base`
  utilities are fine — only `text-base` collides with the font-size utility.

## Codebase Feedback

<!-- Queue for project-index to integrate into .agents/codebase/*.md. -->

- (architecture) App is greenfield from create-next-app; first real feature (001)
  establishes conventions: Server-Component sections, `"use client"` islands for 3D
  and motion, typed content under `src/content/`, tokens in `globals.css`.
