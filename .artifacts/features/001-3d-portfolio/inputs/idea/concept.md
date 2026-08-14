# Concept & Experience — 001 · 3D Portfolio (Huy Le)

> Compiled 2026-08-11 from the two reference sites the user selected:
> **[N]** `neeraj-portfolio-ruby.vercel.app` (dark, cinematic, minimal) and
> **[S]** `sayjeyhi.com` (full 3D, playful, gamified, character-driven).
> This file captures the CONCEPT/STORY and the intended EXPERIENCE — the "what
> it feels like." Visual tokens live in `../style/`; the WHAT lives in `../spec.md`.

---

## 1. One-line pitch

> A cinematic, dark portfolio where a stylized 3D **Huy** works at a glowing desk
> with his tuxedo cat **Bông** — and as you explore, the scene comes alive:
> the character reacts, the cat plays, headlines decode out of static, and Huy's
> real work (Naver Care, InjuryEx, and more) is revealed like scenes in a film.

The medium is the message: a frontend engineer who builds AI-native products,
proving craft by making the portfolio itself a small, polished interactive product.

---

## 2. What we borrow from each reference

| From **[N] Neeraj** (adopt the *look & structure*) | From **[S] Sayjeyhi** (adopt the *life & play*) |
|---|---|
| Dark near-black canvas, single luminous accent, huge uppercase name | A **full interactive 3D character** as the centerpiece, not a static image |
| **Scramble/decode** headline ("A Full Stack …" resolving) | A **"magical twist"** moment — one click/scroll transforms the scene |
| Ultra-minimal nav: monogram · email · ABOUT/WORK/CONTACT · RESUME | Character **transforms** (sits → stands) to reveal a **Skills board** of branded chips |
| "WHAT I DO" — 3D character beside FRONTEND/BACKEND cards w/ corner-bracket framing | Playful, warm personality; a **companion** presence; friendly copy |
| Career **timeline**, numbered **Work carousel** (01/02/03) w/ device mockups | A signature **gimmick** (their "Resume Game") that makes the résumé memorable |
| Teal **glow-node** dividers, floating UI, contact section + footer credit | Small delight: sound toggle, chat bubble, easter eggs |

**Do NOT copy:** Sayjeyhi's light/pastel palette (we're dark), its exact room
props, or Neeraj's literal copy. Bông is *our* distinguishing element — neither
reference has a pet companion, and it's the thing people will remember.

---

## 3. The experience / narrative arc

A visitor should move through five "beats," each earning the next:

1. **Arrival (identity).** Black screen resolves through a themed loader. The
   hero fades in: teal ambient glow, **HUY LE** in oversized uppercase, and a
   subtitle that **decodes out of mono static** into *"Software Engineer ·
   AI-Native Development."* The 3D Huy sits at a desk; Bông is curled nearby.
   Within seconds you know who this is.

2. **Presence (it's alive).** As the pointer moves, the scene responds — subtle
   camera/parallax, Huy glances or types, **Bông's ears/tail flick**. Hovering
   or clicking Bông triggers a small reaction (stretch, meow ping, look at you).
   This is the "wow, it's interactive" moment — Sayjeyhi's energy, our tone.

3. **The turn (what I do).** Scrolling triggers our **"twist"**: the desk scene
   shifts and a **capabilities board** reveals — filterable groups
   (**Frontend · AI-Native · Backend/APIs · Testing & Quality**) of branded skill
   chips, framed with corner brackets like [N]'s "WHAT I DO" cards. Huy's pose or
   the camera adjusts to present it.

4. **The proof (work + journey).** A **career timeline** (Naver → PTN Global →
   Skyblaze) followed by a numbered **Work showcase (01–04)**: Naver Care (AI
   symptom-triage), InjuryEx, Australian Epilepsy Project, ETech — each with role,
   a one-line impact, tech tags, and a device/preview panel. Teal glow-node
   dividers connect the beats.

5. **The invitation (contact).** A quiet, confident close: oversized "LET'S
   TALK / GET IN TOUCH," email + socials (LinkedIn, GitHub, Instagram), optional
   résumé download, and a footer credit "Designed & built by Huy Le." Bông makes
   a final cameo.

---

## 4. The 3D interaction idea (signature)

- **Centerpiece:** a stylized low-poly-but-polished **Huy at a desk** (dual
  monitors showing code + a health/triage UI nod to Naver Care), warm-lit with a
  **teal rim-light** so it sits in the dark palette.
- **Bông the tuxedo cat** is a first-class companion — idle animations (grooming,
  tail flick, sitting), and **reactive** behaviors on hover/click/proximity
  (look at cursor, stretch, hop onto the desk). Bông is a **hero cameo** — it
  lives in the desk scene and reappears once at Contact; it does not follow the
  visitor between sections.
- **Pointer parallax:** camera + subject shift with `elastic.out` easing (the
  scene leans toward the cursor). Feels weighty, not jittery.
- **Scroll-driven staging:** the scene **transforms** between beats (desk → skills
  reveal → work), Sayjeyhi's "magical twist" reimagined as a scroll choreography.
- **Placeholder-first:** until Meshy models (built from Huy's + Bông's photos)
  exist, ship with a stylized placeholder character + a simple cat proxy so the
  experience is never blocked (AC-008).

---

## 5. Section map (proposed)

| # | Section | Purpose | Reference DNA |
|---|---------|---------|---------------|
| 0 | Loader | Themed asset-load cover → smooth reveal | [S] |
| 1 | Hero | Identity + interactive 3D Huy + Bông + decode subtitle | [N] look + [S] life |
| 2 | What I Do | Capabilities board — filterable branded skill chips | [N] cards + [S] skills |
| 3 | Experience | Career timeline (Naver, PTN Global, Skyblaze) | [N] |
| 4 | Work | Numbered showcase 01–04 with impact + tech + preview | [N] |
| 5 | About / personality | Short human bio — Mekong Delta, cats, Bông | [S] warmth |
| 6 | Contact | Oversized CTA + email/socials + résumé + footer | [N] |

Persistent, minimal **glassmorphic nav**: `HL` monogram · WORK · ABOUT · CONTACT
· résumé — with a **sound toggle** (ambient/SFX for Bông) borrowed from [S].

---

## 6. Delight & personality (the Bông layer)

- Hover/click Bông → reaction (stretch, blink, soft meow if sound on).
- Idle-too-long → Bông does something cute (curls up, chases a cursor dot).
- Konami-style or logo-click easter egg → Bông "helps" (e.g., knocks a teal
  cursor-ball off the desk). Keep tasteful, never gimmicky.
- Microcopy voice: clean-professional by default, with occasional warmth
  ("From the Mekong Delta 🇻🇳", a cat pun in the footer). Not the full 2022 playful voice.

---

## 7. Graceful fallback (must-have)

- **No WebGL / low-power / reduced-motion:** render a **static hero poster**
  (a rendered still of Huy + Bông) with the decode effect disabled; all sections
  become clean animated-2D. Nothing depends on the 3D to be usable.
- **Mobile:** lighter scene or poster, single-column beats, touch-friendly
  reactions (tap Bông), résumé/contact one tap away.

---

## 8. Open creative questions

- ✅ **Twist mechanic (RESOLVED):** **Scroll-driven staging** — the scene
  transforms seamlessly as you scroll (no explicit "magical twist" button).
- ✅ **Bông's role (RESOLVED):** **Hero cameo only** — Bông lives in the hero
  scene as Huy's companion (idle + reactive on hover/click) and makes a final
  cameo at Contact. Bông does NOT actively guide the eye between sections.
- **Skills board grouping:** confirm the four groups (Frontend · AI-Native ·
  Backend/APIs · Testing & Quality) and which chips carry brand icons.
- **Desk-screen content:** OK to nod to Naver Care / a health-triage UI on the
  monitor, or keep it generic code? (Avoid showing anything proprietary.)
- ✅ **Sound (RESOLVED):** Deferred for v1 — no audio assets, and a non-functional
  toggle is a dead control. The sound toggle was removed; it returns when ambient
  + Bông SFX are added.
- **Resume "game":** worth a small [S]-style interactive résumé later, or is a PDF
  enough for v1? Default: PDF now, game as a possible phase-2 flourish.
