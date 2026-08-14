# Style Guide — 001 · 3D Portfolio (Huy Le)

> Compiled 2026-08-11 via the `ui-ux-pro-max` design intelligence skill.
> **Direction:** Modern, engaging, evocative of the technical/frontend sector —
> creative and graphic-design-forward, but disciplined. Dark & moody.
> **Locked decisions:** dark near-black navy base · single luminous **teal**
> accent · oversized uppercase display type · scramble/decode text · full
> interactive 3D hero. Accent color chosen by the user (Teal #2DD4BF).

Companion file: **`tokens.css`** — drop-in Tailwind v4 `@theme` tokens + helpers.

---

## 1. Design System (from ui-ux-pro-max)

| Dimension | Choice | Why |
|-----------|--------|-----|
| **Pattern** | Immersive / Interactive Experience | The 3D hero *is* the product; full-screen interactive element → guided reveal → CTA. ~40% higher engagement. Requires a skip/fallback + mobile fallback. |
| **Style** | Modern Dark ("Cinema") | Dark-primary, cinematic, ambient light, glow, blur, layered, premium. Best-for list literally includes developer tools + AI interfaces. |
| **Mood words** | precise · cinematic · atmospheric · premium · creative · technical | |
| **Avoid** | Corporate templates, generic layouts, emoji-as-icons | Use SVG icons (Lucide / Heroicons). |

---

## 2. Typography

Three roles. Load via `next/font/google` (self-hosted, no layout shift).

| Role | Font | Weights | Usage |
|------|------|---------|-------|
| **Display** | **Space Grotesk** | 500, 700 | Hero name, section headings — UPPERCASE, tight tracking. Geometric, quirky, technical — reads "creative engineer." |
| **Body** | **Inter** | 400, 500, 600 | Paragraphs, UI, project copy. Neutral, highly legible at small sizes. |
| **Mono** | **JetBrains Mono** | 400, 500 | Kickers/eyebrows, labels, tech tags, code, and the **scramble/decode** text effect. Adds terminal/precision texture. |

**Google Fonts (reference URL):**
`https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap`

### Type scale (fluid — `clamp()`)

| Token | Size | Font / treatment |
|-------|------|------------------|
| `display` (hero name) | `clamp(3.25rem, 10vw, 9rem)` | Space Grotesk 700, UPPERCASE, `letter-spacing:-0.03em`, `line-height:0.92` |
| `h1` | `clamp(2rem, 5vw, 3.5rem)` | Space Grotesk 700, UPPERCASE |
| `h2` | `clamp(1.5rem, 3vw, 2.25rem)` | Space Grotesk 500 |
| `h3` | `1.25rem` | Space Grotesk 500 |
| `body-lg` | `1.125rem / 1.6` | Inter 400 |
| `body` | `1rem / 1.65` | Inter 400 |
| `small` | `0.875rem / 1.5` | Inter 400 |
| `eyebrow` / `label` | `0.8125rem` | JetBrains Mono 500, UPPERCASE, `letter-spacing:0.18em` |

**Rules:** base body ≥16px · line-height 1.5–1.65 for body · headings tight.
Never set body text below 14px. Long paragraphs max ~68ch.

---

## 3. Color Palette

Near-black **navy** base (not pure `#000` — avoids OLED smear/banding) with a
single **teal** accent. Off-white text (`#E6EDF6`) rather than pure white for a
softer, more cinematic feel.

### Backgrounds & surfaces
| Token | Hex | Use |
|-------|-----|-----|
| `--bg-deep` | `#05070E` | Deepest — vignette edges, behind hero |
| `--bg-base` | `#0A0E1A` | **Page background** (main) |
| `--surface` | `#111725` | Cards, panels |
| `--surface-raised` | `#161D2E` | Hover/raised cards, popovers |
| `--border` | `#1E2A3D` | Hairline dividers, card borders |
| `--border-accent` | `rgba(45,212,191,0.16)` | Accent-tinted borders / focus outlines |

### Text
| Token | Hex | Use |
|-------|-----|-----|
| `--fg` | `#E6EDF6` | Primary text / headings |
| `--fg-muted` | `#8A97AC` | Secondary text, captions |
| `--fg-subtle` | `#5A6678` | Disabled, faint labels |

### Accent (teal) — the single brand color
| Token | Hex | Use |
|-------|-----|-----|
| `--accent` | `#2DD4BF` | Links, active states, key highlights, 3D rim-light |
| `--accent-bright` | `#5EEAD4` | Hover / focus / hi-light |
| `--accent-dim` | `#14B8A6` | Pressed, subtle fills |
| `--on-accent` | `#04120F` | Text/icon on a solid teal button |
| `--accent-glow` | `rgba(45,212,191,0.30)` | Glows, ambient blobs, box-shadow color |

> **Optional graphic flourish:** a violet `#818CF8` may appear *only* inside
> hero gradients (teal→violet) for an AI-native hint. Keep teal dominant; do not
> promote violet to a second UI color.

### Semantic (used sparingly)
| Token | Hex |
|-------|-----|
| `--success` | `#34D399` |
| `--warning` | `#FBBF24` |
| `--danger` | `#F87171` |

### Contrast check (WCAG)
- `--fg #E6EDF6` on `--bg-base #0A0E1A` → ~15:1 ✓ (AAA)
- `--fg-muted #8A97AC` on `--bg-base` → ~6.4:1 ✓ (AA)
- `--accent #2DD4BF` on `--bg-base` → ~9:1 ✓ (use for text/links freely)
- Solid teal button: `--on-accent #04120F` on `#2DD4BF` → ~10:1 ✓

---

## 4. Background Treatment

Layered, cinematic, never flat:

1. **Base fill:** `--bg-base #0A0E1A`.
2. **Ambient glow blobs:** 2–3 large radial-gradient teal blobs
   (`--accent-glow` at 8–12% opacity, ~600–900px, blurred), slowly drifting
   behind the hero. Gives the "atmospheric ambient light" of the Modern Dark style.
3. **Noise grain:** a tiled SVG/PNG noise overlay at **2–3% opacity** to kill
   gradient banding and add tactile texture.
4. **Optional tech grid:** a very faint dot-matrix or grid (`--border` @ ~3%
   opacity) — signals "engineering" without shouting. Fade it out toward content.
5. **Vignette:** subtle radial darkening toward the viewport edges
   (`--bg-deep`) to focus the eye on the 3D scene.

Avoid: pure black, hard flat panels, harsh gradients.

---

## 5. Shadows & Glows

On dark UIs, elevation comes from **soft shadow + subtle accent glow**, not heavy drop shadows.

| Token | Value | Use |
|-------|-------|-----|
| `--shadow-sm` | `0 1px 2px rgba(0,0,0,0.4)` | Inputs, small chips |
| `--shadow-md` | `0 8px 24px -8px rgba(0,0,0,0.6)` | Cards |
| `--shadow-lg` | `0 24px 60px -20px rgba(0,0,0,0.7)` | Modals, floating panels |
| `--glow-accent` | `0 0 24px rgba(45,212,191,0.35), 0 0 4px rgba(45,212,191,0.55)` | Accent buttons, active nav, the scramble cursor |
| `--glow-ambient` | `0 0 120px rgba(45,212,191,0.14)` | Behind hero / focal elements |
| `--ring-focus` | `0 0 0 2px #0A0E1A, 0 0 0 4px #2DD4BF` | Keyboard focus (never remove focus rings) |

Glassmorphism (headers/nav): `background: rgba(17,23,37,0.6)` + `backdrop-filter: blur(12px)` + 1px `--border`.

---

## 6. Motion & Interaction

Feel: **precise, weighty, cinematic** — motion conveys meaning, never decoration-only.

| Aspect | Spec |
|--------|------|
| **Signature easing** | `expo.out` → `cubic-bezier(0.16, 1, 0.3, 1)` for reveals & transitions |
| **Micro-interactions** | 150–250ms, ease-out |
| **Section reveals** | fade + `translateY(24px)`, stagger 60–80ms, 500–700ms expo.out (on scroll-into-view) |
| **Scramble/decode text** | Headings & eyebrows resolve from random mono glyphs → final text, on load + on scroll-in. JetBrains Mono during scramble. |
| **Hero cursor parallax** | `gsap.quickTo(el,'x'/'y',{duration:0.4, ease:'elastic.out(1,0.4)'})`, offset factor ~0.3 |
| **Magnetic links/buttons** | same quickTo, factor ~0.25–0.3; remove listeners on unmount |
| **3D scene** | continuous idle animation + pointer-driven camera/subject shift; Bông reacts on hover/click |
| **Exit < enter** | exits ~0.7× the enter duration |

### `prefers-reduced-motion` (REQUIRED)
When set: disable scramble, cursor parallax, blob drift, and heavy scene motion;
replace reveals with instant opacity fades; render the 3D hero as a static frame
or poster image. All content stays fully accessible.

---

## 7. Iconography & Components

- **Icons:** SVG only — **Lucide** (outline, 1.5–2px stroke). No emoji as icons.
- **Buttons:** solid teal (primary, `--on-accent` text, `--glow-accent` on hover)
  · ghost/outline (teal border, transparent) · text link (teal underline reveal).
  `cursor-pointer`, ≥44×44px hit target, hover transitions 150–300ms.
- **Cards (project/skill):** `--surface`, 1px `--border`, radius ~16px, lift +
  faint accent border on hover. Corner-bracket framing (like the reference
  "WHAT I DO" cards) is on-brand.
- **Nav:** ultra-minimal, glassmorphic, fixed. Logo/monogram left, 3–4 links,
  contact/resume right. Active link gets teal + underline.

---

## 8. Responsive & A11y guardrails

- Breakpoints: 375 · 768 · 1024 · 1440. Mobile-first, no horizontal scroll.
- Mobile: single column; 3D hero → lighter scene or static poster; touch targets ≥44px.
- Contrast ≥4.5:1 body / ≥3:1 large text — all tokens above pass.
- Visible focus rings, full keyboard nav, `alt`/aria on meaningful content, 3D
  scene marked decorative (`aria-hidden`) with text equivalents nearby.
- Reserve space for async/3D assets to keep CLS < 0.1; themed loader covers load.

---

## 9. Reference Sites — extracted visual patterns

Concrete observations from the two reference sites (captured 2026-08-11), and how
we adapt each. Full experience/story notes live in `../idea/concept.md`.

### [N] neeraj-portfolio-ruby.vercel.app — the *look & structure* we adopt
- **Palette:** near-black navy canvas, one **teal/cyan** accent, off-white type —
  exactly our direction. Faint radial glow bleeds at the screen edges.
- **Type:** enormous **uppercase** display name (`HELLO! I'M` eyebrow → huge
  `NEERAJ SINGH CHAUHAN`); accent color used on a single word (`My **Work**`).
- **Scramble/decode:** the subtitle ("A Full Stack **DEVELOPER/ENGINEER**")
  glitches/cycles between words — our decode effect on the hero subtitle + eyebrows.
- **Nav:** ultra-minimal, no bar — monogram top-left (`NS`), email centered,
  `ABOUT / WORK / CONTACT` top-right, social icons bottom-left, `RESUME` bottom-right.
- **"WHAT I DO":** 3D character at a desk (left) beside **FRONTEND / BACKEND**
  cards (right) inside **corner-bracket** frames with expand chevrons → our
  capabilities board framing.
- **Dividers:** a glowing **teal node** on a vertical hairline connects sections.
- **Work:** numbered **01/02/03** list — title, type ("React App"), TOOLS &
  FEATURES, and a floating **device/screenshot mockup** with prev/next arrows.
- **Sections in order:** Hero → What I Do → Career/Experience timeline → My Work →
  Techstack → Contact → "Designed & Developed by …" footer credit.

### [S] sayjeyhi.com — the *life & interaction* we adopt (NOT its palette)
- **Full interactive 3D character** is the centerpiece (seated at a dual-monitor
  desk with props — clock, plant, side table, a little chick). We keep the
  character-at-desk composition; **Bông the cat replaces the generic props** as
  our signature companion.
- **"Up for a magical twist?"** CTA → the seated character **stands into a
  full-body avatar** while a **Skills board** reveals on the left: filter tabs
  (**Front/Mobile · Backend · Infrastructure · AI**) + **branded skill chips**
  (JavaScript, React, Next.js, Three.js, …). We adapt this as a scroll-driven
  transform + our own skill groups.
- **Chrome-window cards:** intro sits in a macOS-style window (traffic-light dots).
  Optional accent for panels; keep it dark/glass, not light.
- **Personality:** sound toggle + hamburger (top-right), floating chat bubble
  (bottom-left), gamified **"Resume Game"** nav item. We borrow the sound toggle
  and playful-but-restrained tone.
- **⚠ Palette divergence:** Sayjeyhi is **light/pastel** — we deliberately do NOT
  follow that. Our surface is dark navy; we take its *energy*, not its colors.

### Net adaptation
Dark cinematic shell **[N]** + living character-driven interaction **[S]** +
**Bông** as the unique element neither reference has. Teal is the single light
source tying the 3D scene, glows, links, and the decode cursor together.

---

## 10. Quick reference (the "vibe" in one line)

> Near-black navy canvas, one teal light source, oversized uppercase Space
> Grotesk that decodes out of mono static, a living 3D scene glowing in teal —
> quiet, precise, and unmistakably built by a frontend engineer who cares about craft.
