# Editorial Layer — style addendum (from `ui-ux-pro-max`, 2026-08-14)

> An **additive** layer over the *live build*. It does **not** change the current
> palette or fonts. It adds **type-forward editorial structure** adapted from
> reference **[M]** `majd-portfolio.framer.website` (see
> `../reference-sites/sites.md`). Decision: *keep dark, adopt layout only.*

## ⚠ Reconciliation: docs vs. code (read first)

The prose in `style-guide.md`/`spec.md` says *navy + teal + Space Grotesk* — that
is **stale**. The **shipped code** (`src/app/globals.css`, `layout.tsx`) is the
source of truth and uses:

| Token | Live value | Role |
|-------|-----------|------|
| `--color-base` | `#0b1510` (dark green-black) | Page background |
| `--color-deep` | `#060d09` | Vignette / behind hero |
| `--color-accent` | `#d7f24a` (**lime**) | **The single light source** |
| Display font | **Fredoka** (`--font-display`, `.display`, weight 600) | Rounded, keyed to the "Evan" monoline wordmark |
| Body / Mono | Inter / JetBrains Mono | unchanged |
| Brand mark | **"Evan"** monoline SVG (`lib/evanMark.ts`) | nav center + intro |
| Person | **Huy Le** (`content/profile.ts`, monogram `HL`) | content identity |

Everywhere this file (or the DB) says "teal," read **lime `#d7f24a`**; "navy" →
**green `#0b1510`**; "Space Grotesk" → **Fredoka**. The *principle* is identical:
one dark ground, one accent as the only light source.

## Database matches (grounding)

- **Style — "Exaggerated Minimalism":** oversized type `clamp(3rem,10vw,12rem)`,
  extreme negative space, **single accent only**, dramatic contrast. Dark-mode
  Full, WCAG AA. → single accent = **lime**; base stays green.
- **Typography — the DB's oversized-editorial pick is a single dominant grotesk.**
  We keep **Fredoka** (already the display face) and push it **bigger + tighter**,
  not to a new font. Fredoka caps at **700** on Google Fonts — bump `.display`
  600 → 700; get "heavier" from size + tracking + leading, never a fake 900.
- **GSAP presets:** pinned scroll-reveal (scrub), SplitText char-stagger,
  subtle parallax — see Motion below.

## 1. Type-as-spine (the core borrow) — fills a real gap

> Today `HeroWordmark` exists but is **never rendered**; the page opens straight
> into the `About` section and the nav's `#hero` anchor is dead. This pattern
> introduces the missing dedicated **hero band**.

- The name (**the "Evan" wordmark / HUY LE**) becomes the largest thing on screen
  and the **3D Huy + Bông scene overlaps the letters** the way Majd's portrait
  threads through "SOFTWARE ENGINEER."
- **Scale bump** (fluid): hero display → `clamp(3.5rem, 13vw, 11rem)`;
  tracking `-0.03em`; line-height `0.9`.
- Depth order: display type **behind** the 3D focal subject but **above** the
  ambient glow; keep a **lime rim-light** so the subject separates from the
  letters. On no-WebGL fallback, `HeroPoster` overlaps the type instead.

## 2. Corner "runner" labels (editorial detail)

- Pin small **JetBrains Mono** runner labels to hero corners (reuses the
  `.eyebrow` system): e.g. `©2026` bottom-left, `/ ENGINEERING SINCE 2021`
  bottom-right, `HL` monogram top-left. Uppercase, `letter-spacing:0.18em`,
  `--color-fg-subtle`. `aria-hidden` where they duplicate visible identity text.

## 3. Single centered pill nav

- Collapse the current 3-column fixed `Nav` into **one centered floating pill**
  (reuse the `.glass` class: `--glass-bg` + `--glass-blur` + 1px `--color-line`):
  "Evan" mark left · Work/About/Contact center · résumé/`⋯` right.
- Keep it off the hero's above-the-fold identity text (UX sticky-nav rule);
  preserve the existing `scroll-margin-top` on `section[id]`.

## 4. Centered mission-statement beat

- Insert a quiet **centered statement** section between the new Hero and
  `WhatIDo`: one 3–4 line line-broken sentence at `h2` scale, `--color-fg`, acres
  of whitespace (a "breath" beat) — mirrors [M]'s "From idea to launch…".
- Copy sourced/condensed from `content/profile.ts` `summary` in Huy's voice.

## 5. Motion presets (GSAP) + guardrails

| Preset | Use | Caveats |
|--------|-----|---------|
| **Pinned scroll-reveal (scrub)** | Hero type-as-spine: pin once, scrub headline `opacity/y` + subtle bg parallax as the 3D scene settles over the letters. | Pin **≤1–2 sections total**; call `ScrollTrigger.refresh()` after fonts/images load; test mid-tier mobile. |
| **SplitText char-stagger** | Optional enrichment of the existing `ScrambleText` on the hero word. | SplitText is a **GSAP Club/paid plugin** — confirm license or fall back to the existing scramble/plain fade; `split.revert()` on unmount for a11y. |
| **Parallax (subtle)** | Runner labels + `glow-blob` only (`yPercent 5–15`, `ease:none`, scrub). | **Never** parallax body copy or controls; `will-change:transform` only during scroll. |

### `prefers-reduced-motion` (REQUIRED — High severity)
When set: **disable pin, scrub, SplitText, parallax**; render the hero statically
(display type + `HeroPoster`, instant opacity fade only). The existing
`usePrefersReducedMotion` hook + the global reduced-motion CSS already gate motion
— extend the same gate to the new pin. Pinned scroll-jacking causes nausea.

## 6. Accessibility guardrails (High severity)

- Oversized lime/off-white display on green already passes contrast — keep it.
- Pill nav: real `<nav>`, keyboard-navigable, visible `:focus-visible` ring
  (already defined); don't let it cover the first heading.
- Decorative runner labels & the 3D canvas → `aria-hidden`; ensure name/title/
  mission stay exposed to screen readers nearby (they already are in markup).
- Reserve space for the pinned hero so CLS < 0.1; the `IntroOverlay` covers load.

## What we deliberately do NOT take from [M]
Cream/light palette · Archivo · Framer template/testimonials/blog sections ·
"Made in Framer" badge. **Lime-on-green remains the single light source.**
