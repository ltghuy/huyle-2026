---
id: 001
feature: portfolio
type: greenfield
scope: complex
status: done
branch: main
created: 2026-08-11
updated: 2026-09-25
supersedes: [001-3d-portfolio, 002-editorial-restyle, 003-webgl-globe-gallery]
---

# Feature: Personal Portfolio (evan-le)

> **ℹ AS-BUILT / CONSOLIDATED — 2026-09-25.** This single spec replaces the three
> earlier features (001 `3d-portfolio`, 002 `editorial-restyle`, 003
> `webgl-globe-gallery`). Those were removed: 001's interactive 3D hero + Meshy
> pipeline never shipped and were deleted; 002's "scene composed *through* the
> name" premise never landed; 003 only documented the gallery. Acceptance criteria
> here describe **what actually ships**. Source of truth remains the code +
> `.agents/knowledge.md`; this spec tracks it.

## Overview

Huy Le (Le Tran Gia Huy) is a Software Engineer with 4+ years building production
web platforms (Naver Care, InjuryEx, the Australian Epilepsy Project, ETech). This
is his personal portfolio: a single-page, editorial, type-led site that presents
his identity, capabilities, spotlighted work, experience, and contact — with one
interactive WebGL centrepiece (a draggable photo globe) as the signature craft
moment. The site ships in English and Vietnamese.

The visual language is dark and editorial: a dark-green ground (`#0b1510`), a
single lime accent (`#d7f24a`), oversized display type as the spine of the
opening, disciplined negative space, and mono "runner" labels. The medium is part
of the message — the motion and WebGL work is itself evidence of front-end craft.

The site is progressively enhanced and static/edge-rendered: no backend, database,
or auth. It degrades gracefully without WebGL, under reduced-motion, on touch, and
with JavaScript disabled.

## Goals

- [x] A visitor understands within seconds who Huy is, his title
      ("Software Engineer · AI-Native Development"), and how to reach him.
- [x] The opening reads as deliberately editorial (oversized type as spine, a
      single accent, corner runner labels, a consolidated floating nav, a focused
      statement beat) rather than a generic bio-beside-a-picture layout.
- [x] Core professional content is present: about/intro, a "what I do"
      capabilities view, spotlighted work, an experience timeline, and contact.
- [x] The personal photos are presented as a memorable interactive WebGL globe
      cohesive with the site's single-accent aesthetic.
- [x] The site is available in English and Vietnamese, with the choice persisted.
- [x] The site performs well on modern devices and degrades gracefully on
      low-power devices and when WebGL/JS cannot run.
- [x] The site is responsive (mobile → desktop) and meets baseline accessibility
      (keyboard, reduced-motion, readable contrast, screen-reader).
- [x] The site builds and deploys to production (Cloudflare via OpenNext).

## Out of Scope

| Feature | Reason |
|---------|--------|
| Interactive 3D character/cat hero scene | Attempted under old 001; removed. Hero is a static portrait straddling the oversized role type |
| Blog / writing / CMS | Not part of this release |
| Backend, database, or auth | Content-driven, static/edge-rendered |
| Contact form with server submission | Email + social links are sufficient |
| Analytics dashboards / A-B testing | Not needed to ship |
| A lightbox / full-screen photo viewer | The globe is a browse/impression piece |
| Runtime photo upload / photo CMS | Photos are static assets under `public/assets/gallery/` |
| Additional languages beyond en/vi | Only English + Vietnamese for now |

## User Stories

### P1: First impression & editorial identity

- As a visitor, I want the opening dominated by oversized type with a striking
  portrait, so I instantly grasp whose site this is and feel the craft.
- **Why P1:** The opening is the reason the site exists.
- **Independent Test:** Load the home page on desktop; the oversized role type is
  the largest element, a portrait composes with it, and the name/title/contact are
  reachable.

**Acceptance Criteria:**

- [x] AC-001: WHEN the home page loads THEN the site SHALL present a dedicated
      opening panel in which oversized display type ("SOFTWARE ENGINEER") is the
      single largest visual element on screen.
- [x] AC-002: WHEN the opening renders THEN a portrait SHALL compose with the
      oversized type (straddling the lower line) without obscuring its letterforms.
- [x] AC-003: WHEN the opening renders THEN small editorial "runner" labels (a
      `©2026` mark and an "engineering since" marker) SHALL appear pinned to the
      panel's corners (hidden on the smallest screens to avoid colliding with the
      portrait).
- [x] AC-004: WHEN the visual treatment is viewed THEN it SHALL be dark
      (dark-green ground, a single lime accent, oversized uppercase display type)
      with generous negative space.
- [x] AC-005: WHEN the page loads THEN the visitor's name and title SHALL be
      exposed for SEO / no-JS / screen readers via an `sr-only` `h1` and the nav.

### P1: Consolidated floating navigation

- As a visitor, I want one clear, compact navigation control, so the chrome feels
  intentional and never competes with the opening statement.
- **Why P1:** The consolidated nav is a defining part of the editorial look.
- **Independent Test:** On load, navigation is one centered floating control (not
  spread edge-to-edge); it never covers the opening identity text; every link works
  by mouse and keyboard.

**Acceptance Criteria:**

- [x] AC-006: WHEN the page loads THEN navigation SHALL be a single, centered,
      floating control (glass pill) rather than links spread across the viewport.
- [x] AC-007: WHEN the floating nav is shown THEN it SHALL NOT obscure the opening
      panel's identity text at any supported viewport size.
- [x] AC-008: WHEN the visitor operates the nav by mouse or keyboard THEN all links
      SHALL be reachable, focus SHALL be visibly indicated, and each link SHALL
      resolve to a real in-page destination (no dead anchors).

### P1: Statement, capabilities, work & experience

- As a hiring manager, I want a clear statement of what Huy does plus his
  capabilities, standout projects, and experience, so I can judge fit and seniority.
- **Why P1:** A beautiful shell with no substance fails the core purpose.
- **Independent Test:** Scroll past the opening; a centered statement, a "what I
  do" view, spotlighted projects, and an experience timeline are all readable.

**Acceptance Criteria:**

- [x] AC-009: WHEN the visitor scrolls past the opening and before the capabilities
      section THEN a single, centered, short statement passage SHALL appear
      surrounded by generous negative space.
- [x] AC-010: WHEN the visitor scrolls further THEN a "what I do" / capabilities
      view SHALL summarize Huy's focus areas and key skills.
- [x] AC-011: WHEN the work section is shown THEN it SHALL spotlight at least three
      real projects, each with a name, role/context, a short description, and
      relevant technologies.
- [x] AC-012: WHEN the experience section is shown THEN it SHALL present Huy's work
      history (roles, companies, context) as a readable timeline.
- [x] AC-013: WHEN sections come into view on scroll THEN their content SHALL
      animate in without impeding readability.

### P1: Interactive WebGL photo-globe gallery ("Off the clock")

- As a visitor, I want the personal photos shown as a rotating 3D globe I can spin,
  so the section feels crafted and invites exploration.
- **Why P1:** The globe is the site's signature interactive centrepiece.
- **Independent Test:** On a WebGL-capable desktop with motion allowed, scroll to
  the gallery: photos are suspended inside a spinning green wireframe sphere on a
  grid floor, and it can be dragged.

**Acceptance Criteria:**

- [x] AC-014: WHEN the gallery mounts where WebGL and motion are both available THEN
      the photos SHALL be presented as tiles distributed over a sphere, rendered
      full-bleed to the section's width.
- [x] AC-015: WHEN the globe is shown THEN the photos SHALL sit on an inner sphere
      *inside* an outer lat/long wireframe cage, spread evenly (no pole-clustering)
      as upright rounded 4:3 cards facing outward, cycling through the photos when
      there are more tiles than photos.
- [x] AC-016: WHEN a tile rotates toward the silhouette or far hemisphere THEN it
      SHALL fade/cull, so the far side reads as the back of a real globe.
- [x] AC-017: WHEN the visitor drags THEN the globe SHALL rotate on both yaw and
      pitch following the pointer; on release with velocity it SHALL coast to a stop
      (momentum + friction); when left alone it SHALL idle-drift; pitch SHALL be
      clamped so it never flips over the poles; the cursor SHALL show a grab
      affordance.
- [x] AC-018: WHEN the pointer hovers a photo tile THEN a water-ripple SHALL run
      through that tile from the cursor and ease back out on leave.
- [x] AC-019: WHEN the globe renders THEN it SHALL read as a thin lime lat/long
      wireframe sphere sitting on a receding green perspective floor grid that fades
      into the background.
- [x] AC-020: WHEN the visitor hovers a tile THEN a non-interactive editorial
      overlay SHALL show the focused photo's index (`NN / NN`) and caption plus a
      "drag to explore" SVG cue in the mono runner style.

### P1: Contact & reachability

- As an interested visitor, I want clear ways to contact Huy and view his profiles,
  so I can start a conversation.
- **Why P1:** A portfolio that doesn't convert interest into contact fails its job.
- **Independent Test:** From the contact section, locate and use an email link and
  social profile links that open correctly.

**Acceptance Criteria:**

- [x] AC-021: WHEN a visitor looks for contact options THEN the site SHALL provide
      an email link and links to Huy's professional/social profiles.
- [x] AC-022: WHEN a contact or social link is activated THEN it SHALL open the
      correct destination (mail client or external profile).
- [x] AC-023: WHEN an affordance has no working destination (e.g. no résumé PDF)
      THEN it SHALL be omitted rather than shown as a dead control.

### P1: Bilingual content (English / Vietnamese)

- As a Vietnamese-speaking visitor, I want to read the site in Vietnamese, so the
  content is fully accessible to me.
- **Why P1:** Bilingual reach is a shipped, first-class capability.
- **Independent Test:** Toggle the language switcher; prose across sections swaps
  between English and Vietnamese and the choice persists across reloads.

**Acceptance Criteria:**

- [x] AC-024: WHEN the site loads THEN a language switcher SHALL be available to
      choose English or Vietnamese.
- [x] AC-025: WHEN the visitor switches language THEN translatable prose across
      sections SHALL update while structural data (tech, hrefs, image srcs, icons)
      stays shared.
- [x] AC-026: WHEN the visitor returns THEN their language choice SHALL persist.

### P2: Responsive & graceful degradation (no regressions)

- As a mobile, low-power, no-WebGL, reduced-motion, keyboard, or screen-reader
  visitor, I want the site to work fully, so I get a good experience regardless of
  hardware or preferences.
- **Why P2:** Broadens reach and protects the impression; the desktop experience is
  the primary showcase but no visitor may lose access.

**Acceptance Criteria:**

- [x] AC-027: WHEN the site is viewed on mobile THEN the oversized type, floating
      nav, corner labels, statement, and all sections SHALL adapt to a
      single-column, touch-friendly layout with no horizontal scroll.
- [x] AC-028: WHEN WebGL is unavailable OR `prefers-reduced-motion: reduce` is set
      OR JavaScript is disabled THEN the gallery SHALL render a native horizontal
      scroll-snap row of the same photos instead of the WebGL scene.
- [x] AC-029: WHEN reduced motion is requested THEN non-essential animations
      (intro overlay, scroll-driven motion, parallax, scene motion) SHALL be
      reduced or disabled while all content stays accessible.
- [x] AC-030: WHEN viewed by a screen-reader user THEN meaningful content SHALL be
      exposed as text, all images SHALL carry descriptive `alt`, and decorative
      corner labels / the WebGL scene SHALL not trap focus or add noise.
- [x] AC-031: WHEN JavaScript is disabled THEN the essential identity, content, and
      contact information SHALL remain readable.
- [x] AC-032: WHEN oversized type and fonts load THEN visible layout shift SHALL
      stay minimal (no jarring reflow of the opening).

### P3: Personality & delight

- As a visitor, I want small delightful touches, so the site feels human and
  memorable.
- **Why P3:** Elevates the experience but is not required for the core purpose.

**Acceptance Criteria:**

- [x] AC-033: WHEN the site loads THEN a themed intro/loading state SHALL cover the
      first paint and transition smoothly into the experience (skippable, and
      disabled under reduced motion).

## Edge Cases

- WHEN WebGL is unavailable or fails to initialize THEN the gallery SHALL show the
  static scroll-snap photo row and the rest of the page SHALL remain fully usable.
- WHEN the intro overlay is showing THEN a key press or interaction SHALL skip it,
  and content SHALL become reachable (the overlay must not trap the page).
- WHEN fonts load late THEN the oversized type SHALL not cause a large reflow.
- WHEN the viewport is very short (landscape phone) THEN the floating nav and the
  opening identity text SHALL not overlap or clip.
- WHEN a pointer is unavailable (touch-only) THEN the opening and gallery SHALL
  present sensible non-hover defaults.
- WHEN JavaScript is disabled THEN identity, content, and contact SHALL be readable.
- WHEN an external project/social link is missing THEN the site SHALL omit it rather
  than render a dead control.

## Success Criteria

- [x] A first-time visitor can state Huy's name, title, and one thing he has built
      within ~10 seconds of landing.
- [x] A viewer describes the opening as "editorial / type-led," not "bio beside a
      picture."
- [x] The WebGL photo globe renders and responds to drag on a modern desktop at a
      smooth frame rate.
- [x] The site is fully usable (content + contact) on mobile, without WebGL, under
      reduced-motion, by keyboard, and by screen reader.
- [x] The site is readable in both English and Vietnamese with the choice persisted.
- [x] The site builds and deploys to production successfully.

## Open Questions

- **Résumé:** Should a downloadable résumé (PDF) be surfaced? The link stays hidden
  until a file exists (AC-023).
- **Domain:** Custom domain vs the current Cloudflare project subdomain (`huyle-2026`).

## Notes

- Authoritative content lives in `src/content/` (`profile.ts`, `experience.ts`,
  `projects.ts`, `skills.ts`, `socials.ts`, `gallery.ts`); Vietnamese overrides in
  `vi.ts` spread the English source so only translated prose diverges.
- Locked creative decisions: dark-green + single lime accent; Fredoka display /
  Inter body / JetBrains Mono; editorial type-led opening; the WebGL photo globe as
  the signature interactive moment.
- **Palette/type history:** older prose docs described navy + teal + Space Grotesk;
  that was never shipped and those input docs were removed. Live = dark-green +
  lime + Fredoka. Code is the source of truth.
- Reference sites (inspiration, not copied): `majd-portfolio.framer.website`
  (editorial type-led layout), `jesperlandberg.com` (wireframe globe on a grid
  floor). See `inputs/reference-sites/sites.md`.
- Deployment: Cloudflare via OpenNext (`wrangler` worker `huyle-2026`).
