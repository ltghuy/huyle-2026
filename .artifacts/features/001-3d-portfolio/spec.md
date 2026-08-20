---
id: 001
feature: 3d-portfolio
type: greenfield
scope: complex
status: superseded
branch: main
created: 2026-08-11
---

# Feature: 3D Interactive Portfolio Website

> **⚠ SUPERSEDED — 2026-08-20.** This feature's interactive 3D hero (the `Scene`
> with character/cat/desk GLB models, `HeroExperience`/`HeroPoster` WebGL +
> fallback, and the Meshy model pipeline) was never completed and has been
> **removed from the codebase**. The live site uses the 002 editorial re-style: a
> static `HeroPortrait` hero and a WebGL wireframe photo-globe gallery. The
> palette/fonts here (navy + teal + Space Grotesk) are also stale — shipped is
> dark green `#0b1510` + lime `#d7f24a` + Fredoka/Inter/JetBrains Mono. Kept as
> historical record only; its acceptance criteria are **not live**. Current
> truth: the code + `.agents/knowledge.md`.

## Overview

Huy Le (Le Tran Gia Huy) is a Software Engineer with 4+ years building
production web platforms (Naver Care, InjuryEx, the Australian Epilepsy Project,
ETech). He has older portfolios but no single site that presents his current
seniority, his AI-native product work, and his personality in one memorable
experience. Recruiters, hiring managers, and collaborators who land on a generic
CV-style page form a forgettable first impression that undersells the work.

This feature delivers a personal portfolio built around an interactive 3D hero
scene: a stylized character of Huy at a desk, accompanied by his tuxedo cat
Bông as a reacting companion. The visual language is dark and moody — a
near-black background, a single luminous accent color, oversized uppercase
typography, and text that animates with a scramble/decode effect — inspired by
the two reference sites. The result is a site that is technically impressive on
its own merits (the medium demonstrates the craft) while remaining fast,
accessible, and clear about who Huy is and what he has shipped.

## Goals

- [ ] A visitor understands within seconds who Huy is, his title
      ("Software Engineer · AI-Native Development"), and how to reach him.
- [ ] The hero presents an interactive 3D scene (character + Bông the cat) that
      responds to visitor input (pointer movement and/or click) without blocking
      the reading of core content.
- [ ] Core professional content is presented: an intro/about, a "what I do"
      capabilities view, spotlighted work, and contact links.
- [ ] The site performs well on modern devices and degrades gracefully on
      low-power devices and when 3D cannot run.
- [ ] The site is responsive (mobile → desktop) and meets baseline accessibility
      expectations (keyboard, reduced-motion, readable contrast).
- [ ] The site is deployable to production (Vercel) from the existing stack.

## Out of Scope

| Feature | Reason |
|---------|--------|
| Blog / writing / CMS | Not part of the first release; can be a later feature |
| Backend, database, or auth | Portfolio is content-driven and static/edge-rendered |
| Contact form with server submission | A direct email/social link path is sufficient for v1 |
| Multi-language (i18n) | English-only for v1; can be added later |
| Analytics dashboards / A-B testing | Not needed to ship the first version |
| Photorealistic likeness of Huy | Stylized character is the intent; exact likeness is not a goal |
| Producing the final 3D character/cat art in this feature | Model generation depends on photos supplied later; scene must work with a placeholder until then |

## User Stories

### P1: First impression & identity

- As a visitor, I want to immediately see who Huy is, his title, and a striking
  hero, so that I form a strong first impression and know I'm in the right place.
- **Why P1:** The hero is the reason this site exists; without it there is no
  differentiated first impression.
- **Independent Test:** Load the home page on a desktop browser; the name, title,
  tagline, and hero visual are visible and legible above the fold.

**Acceptance Criteria:**

- [x] AC-001: WHEN the home page loads THEN the site SHALL display Huy's name,
      the title "Software Engineer · AI-Native Development", and a short tagline.
- [x] AC-002: WHEN the hero renders THEN a headline SHALL animate with a
      scramble/decode text effect that settles into readable text.
- [x] AC-003: WHEN the page is viewed THEN the visual treatment SHALL be dark
      (near-black background, a single luminous accent color, oversized uppercase
      display type) with generous negative space.
- [x] AC-004: WHEN the page loads THEN persistent, minimal navigation SHALL be
      present linking to the main sections and to primary contact/social links.

### P1: Interactive 3D hero scene with Bông

- As a visitor, I want an interactive 3D scene of Huy at a desk with his cat
  Bông that reacts to my input, so that the site feels alive and memorable.
- **Why P1:** The interactive 3D scene (character + cat companion) is the
  signature experience and the core creative decision.
- **Independent Test:** On a capable desktop, move the pointer over the hero and
  observe the scene respond (parallax/orbit and/or the character or cat reacting);
  the scene animates continuously without freezing the page.

**Acceptance Criteria:**

- [x] AC-005: WHEN the hero scene is displayed on a capable device THEN it SHALL
      render an animated 3D character of Huy at a desk.
- [x] AC-006: WHEN a visitor moves the pointer over the scene THEN the scene
      SHALL respond (e.g., parallax or camera/subject shift) in real time.
- [x] AC-007: WHEN the scene includes Bông the cat THEN Bông SHALL be visibly
      present and SHALL react to visitor interaction (hover and/or click).
- [x] AC-008: WHEN the final character/cat models are not yet available THEN the
      scene SHALL render an acceptable placeholder so the experience is not blocked.
- [x] AC-009: WHEN the scene is interactive THEN it SHALL maintain a smooth frame
      rate on a modern mid-range device and SHALL NOT block scrolling or reading
      of the surrounding content.

### P1: What I do & spotlighted work

- As a hiring manager, I want to see Huy's capabilities and a few standout
  projects with context, so that I can quickly judge fit and seniority.
- **Why P1:** Content credibility is essential; a beautiful shell with no
  substance fails the core purpose.
- **Independent Test:** Scroll past the hero; a capabilities section and at least
  three spotlighted projects with descriptions are readable and navigable.

**Acceptance Criteria:**

- [x] AC-010: WHEN a visitor scrolls past the hero THEN a "what I do" /
      capabilities view SHALL summarize Huy's focus areas and key skills.
- [x] AC-011: WHEN the work section is shown THEN it SHALL spotlight at least
      three real projects, each with a name, role/context, a short description,
      and relevant technologies.
- [ ] AC-012: WHEN a spotlighted project has an external link (live demo or
      source) THEN the site SHALL surface that link.
- [x] AC-013: WHEN sections come into view on scroll THEN their content SHALL
      animate in without the animation impeding readability.

### P1: Contact & reachability

- As an interested visitor, I want clear ways to contact Huy and view his
  profiles, so that I can start a conversation.
- **Why P1:** A portfolio that doesn't convert interest into contact fails its job.
- **Independent Test:** From any section, locate and use a contact path (email
  link and social profile links) that opens correctly.

**Acceptance Criteria:**

- [ ] AC-014: WHEN a visitor looks for contact options THEN the site SHALL provide
      an email link and links to Huy's professional/social profiles.
- [x] AC-015: WHEN a contact or social link is activated THEN it SHALL open the
      correct destination (mail client or external profile).

### P2: Responsive & graceful degradation

- As a mobile or low-power visitor, I want the site to work well on my device,
  so that I get a good experience regardless of hardware.
- **Why P2:** Broadens reach and protects the impression, but the P1 desktop
  experience is the primary showcase.

**Acceptance Criteria:**

- [x] AC-016: WHEN the site is viewed on mobile THEN layout and content SHALL
      adapt to a single-column, touch-friendly presentation.
- [x] AC-017: WHEN the device cannot run the interactive 3D scene (unsupported,
      low power, or an error) THEN the site SHALL fall back to a static or
      lightweight visual and remain fully usable.
- [x] AC-018: WHEN the visitor has requested reduced motion THEN non-essential
      animations (including scramble and heavy scene motion) SHALL be reduced or
      disabled while content stays accessible.

### P3: Personality & delight

- As a visitor, I want small delightful touches (especially around Bông), so
  that the site feels human and memorable.
- **Why P3:** Elevates the experience but is not required for the core purpose.

**Acceptance Criteria:**

- [x] AC-019: WHEN a visitor interacts with Bông or specific hotspots THEN a small
      delightful reaction or easter-egg SHALL occur.
- [x] AC-020: WHEN the site loads THEN a themed loading state SHALL cover asset
      loading and transition smoothly into the experience.

## Edge Cases

- WHEN 3D/WebGL is unavailable or fails to initialize THEN the site SHALL show a
  graceful fallback visual and keep all content readable.
- WHEN large 3D assets are still loading THEN the site SHALL show a loading state
  and SHALL NOT display a broken or empty hero.
- WHEN the visitor is on a slow connection THEN core text content SHALL be usable
  before heavy assets finish loading.
- WHEN reduced-motion is requested THEN motion-heavy effects SHALL be minimized.
- WHEN the pointer is unavailable (touch-only) THEN interaction SHALL have a
  touch-appropriate equivalent or a sensible non-interactive default.
- WHEN JavaScript is disabled THEN the essential identity and contact information
  SHALL still be readable.
- WHEN viewed by a screen-reader user THEN meaningful content SHALL be exposed and
  the decorative 3D scene SHALL not trap or confuse navigation.
- WHEN an external project/social link is broken or missing THEN the site SHALL
  omit or clearly handle it rather than showing a dead control.

## Success Criteria

- [ ] A first-time visitor can state Huy's name, title, and one thing he has built
      within ~10 seconds of landing.
- [ ] The interactive 3D hero renders and responds to input on a modern desktop
      browser at a smooth frame rate.
- [ ] The site remains fully usable (content + contact) on mobile and when 3D is
      unavailable.
- [ ] Core content is readable before heavy 3D assets finish loading.
- [ ] Reduced-motion and keyboard users can consume all content and reach contact.
- [ ] The site builds and deploys to production successfully.

## Open Questions

- ✅ **Featured work (RESOLVED):** Spotlight four professional projects in order —
  Naver Care (AI symptom-triage), InjuryEx, Australian Epilepsy Project, ETech.
  The 2022 personal projects are omitted from v1.
- ✅ **Privacy (RESOLVED):** Phone number scrubbed from `about-me.md` (2026-08-11).
  It is NOT displayed on the site; contact is email + socials only. `.artifacts/`
  stays git-tracked (specs are valuable).
- **Character likeness:** Reference photos of Huy and of Bông (tuxedo cat) are not
  yet provided. Until then the scene uses a placeholder; final models to be
  generated from photos later. Confirm the placeholder approach is acceptable for v1.
- **Resume:** Should a downloadable résumé (PDF) be surfaced (as on the reference
  site)? If yes, which file.
- **Domain:** Is there a custom domain to target, or is a Vercel subdomain fine for v1?
- **Tone of copy:** Cleaner professional 2026 voice (default) vs the playful 2022
  voice — confirm for microcopy.

## Notes

- Reference sites (inspiration, not to copy): the dark/minimal aesthetic and the
  "what I do" 3D-character-plus-skill-cards pattern come from
  neeraj-portfolio-ruby.vercel.app; the full playful 3D room scene and the
  character-at-desk composition come from sayjeyhi.com.
- Authoritative content source: `inputs/content/about-me.md` (compiled from Huy's
  2026 CV). Contact/social values, experience, and skills come from there.
- Locked creative decisions (from the user): dark & moody aesthetic; full
  interactive 3D scene; title "Software Engineer · AI-Native Development"; Bông the
  tuxedo cat featured as a reacting companion.
- The medium is part of the message: doing the 3D and motion well is itself
  evidence of front-end craft, which is the professional point of the site.
