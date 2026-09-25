# Reference Sites — 001 · 3D Portfolio

Inspiration sites. **Not to be copied** — we extract patterns and adapt them to
Huy's dark, teal, Bông-centric direction (see `../style/style-guide.md`).

| Tag | URL | Adopt for… |
|-----|-----|-----------|
| **[N]** | `neeraj-portfolio-ruby.vercel.app` | Look & structure (dark, cinematic, minimal) — documented in `style-guide.md §9` |
| **[S]** | `sayjeyhi.com` | Life & play (full 3D character, gamified) — documented in `style-guide.md §9` |
| **[M]** | `majd-portfolio.framer.website` | **Editorial type + layout discipline** (this file) |

---

## [M] majd-portfolio.framer.website

> Captured 2026-08-14 via headless browser (real computed styles + screenshots,
> not inferred). A Framer-built portfolio for **Majd**, a software engineer /
> Framer creator. We reference it for **typographic scale, editorial layout, and
> big-neutral-canvas discipline** — NOT its light palette.

### Snapshot

- **Name / role:** "Majd — Software engineer and Framer creator," Syria; founder of Templyo.
- **Hero copy:** giant `SOFTWARE ENGINEER` set as the display, a portrait block
  centered *behind/through* the type, with a `©2026` monogram bottom-left and
  `/CREATING SINCE 2020` bottom-right as editorial "runner" labels.
- **Sections in order:** Hero → intro ("Hey!" + bio) → big centered statement
  ("From idea to launch…") → **Services** (4) → **Featured Projects** (grid) →
  **Testimonials** → **Thoughts** (blog) → **Let's talk** CTA → footer.

### Palette (measured, not guessed)

| Role | Value | Note |
|------|-------|------|
| Canvas | `#FAF7F3` (rgb 250,247,243) | **Warm cream off-white** — not stark white. Subtle paper-grain noise. |
| Ink | `#111111` (rgb 17,17,17) | Near-black text + solid dark panels |
| Inverse text | `#FAF7F3` on `#111111` | Dark cards (blog/CTA) invert to cream text |
| Accents | Red portrait block; **chrome/iridescent** 3D star + lightning-bolt props | Color lives in project thumbnails, not the chrome itself |

> ⚠ **Palette divergence (like [S]):** [M] is a *light warm-neutral* theme. We
> stay **dark navy + teal**. We take its **structure and type energy**, not its color.

### Typography (measured)

- **One family does everything: `Archivo`** (grotesque). Display uses heavy
  **800**, section headings **600**, card titles **500**. No separate body face.
- Hero display ~46px→huge fluid, authored **UPPERCASE** (`text-transform:none` but
  copy is capitalized). Section H2s ~46–48px, weight 600, **sentence case**
  ("Services", "Featured Projects", "Let's talk.").
- **Takeaway:** confident single-family editorial voice; hierarchy by *size +
  weight*, not by mixing fonts.

### Distinctive layout patterns (the reason to reference it)

1. **Oversized display type as the page's spine** — the hero word is the biggest
   thing on screen and content threads *through/behind* it (portrait overlaps the
   letters). High-craft "type-forward" editorial feel.
2. **Runner labels / monogram corners** — `©2026`, `/CREATING SINCE 2020` pinned
   to hero corners in mono-ish small caps. Cheap, high-impact editorial detail.
3. **Floating pill nav** — a single rounded-rect black pill, centered top, brand
   left + `⋯` menu right. Minimal, detached from any bar.
4. **Big centered statement section** — one paragraph, ~4 lines, centered, acres of
   negative space. A "breath" beat between hero and services.
5. **Services as a compact tag grid** — 4 services, each with 3 sub-tags
   (e.g. "Web Migration · Optimization · Framer Rebuild").
6. **Projects: 2-col grid of large rounded browser-mockup cards** on saturated
   color backgrounds, with a big Archivo title + one-line type below each.
7. **Persistent floating action stack** — bottom-right "Use for Free / More
   Templates" pills stay pinned while scrolling.
8. **Chrome/iridescent 3D props** (star, lightning bolt) as sparse decorative
   accents floating around the hero — glossy, playful, restrained.

### What we adopt for OUR site (dark green + lime + Bông)

> Note: the *shipped* palette is dark green `#0b1510` + **lime** `#d7f24a` +
> Fredoka (not the navy/teal/Space Grotesk in the older docs). Read "teal" below
> as **lime** — see `../style/editorial-layer.md` §Reconciliation.

| From [M] | How we adapt it |
|----------|-----------------|
| Oversized display type as spine; content threading through it | Let **HUY LE** / section words go bigger & bolder; allow the 3D Huy+Bông scene to overlap the display type the way Majd's portrait overlaps "SOFTWARE ENGINEER". |
| Runner labels / monogram corners | Add `©2026` / `/ ENGINEERING SINCE 20XX` style mono runners in hero corners — pairs perfectly with our JetBrains-Mono eyebrow system. |
| Floating pill nav | Consider consolidating our glass nav into a **single centered pill** (still glass/dark), matching [N]'s minimalism. |
| Big centered statement beat | Insert a quiet centered mission line between hero and "What I Do". |
| Warm-neutral canvas discipline (one calm base, color only in content) | Keep our **navy** base equally disciplined; let **teal** be the only "light source" the way [M] keeps color in thumbnails only. |
| Editorial weight hierarchy | Reinforces our Space Grotesk 700/500 scale — lean **heavier** on the display weight. |

**Do NOT copy:** the light/cream palette, Archivo (we use Space Grotesk), the
Framer template/testimonials/blog sections, or the "Made in Framer" badge.

### Screenshots (captured 2026-08-14)

Hero, centered-statement, and projects-grid frames were captured during analysis.
Re-capture on demand via headless browser at 1440×900 (they are large binaries and
not committed here; the measured styles above are the durable record).
