---
id: 002
feature: editorial-restyle
type: brownfield
scope: large
status: done
branch: main
created: 2026-08-14
---

# Feature: Editorial Re-style Layer

## Overview

The portfolio (feature 001) is shipped and functional, but its opening reads as a
conventional two-column bio-beside-a-visual. Compared with the editorial reference
the user selected (`majd-portfolio.framer.website`), it lacks a single, arresting,
type-led first impression — the kind where the name is unmistakably the biggest
thing on screen and the interactive scene lives *inside* that statement rather
than beside it. The result is a strong site whose first frame undersells its own
craft.

This feature is a **re-style layer**: it re-composes existing sections into a more
editorial, type-forward layout while keeping the established dark, single-accent
aesthetic and all existing content unchanged. It introduces a dedicated
name-as-hero opening, editorial corner labels, a consolidated floating navigation
control, and a focused single-statement passage — adapting *layout and typographic*
patterns (not the palette) from the reference. It must preserve every
accessibility, reduced-motion, responsive, and graceful-3D-fallback guarantee the
current site already provides.

## Goals

- [x] A first-time visitor's eye lands on the name as the single largest element,
      with the interactive scene composed *through* it, within the first frame.
- [x] The opening, navigation, and section rhythm read as deliberately editorial
      (oversized type, disciplined single accent, generous negative space, a
      focused statement beat) rather than a generic bio layout.
- [x] No existing content, contact path, or capability is lost, and the dark
      single-accent visual identity is preserved.
- [x] Every existing accessibility, reduced-motion, responsive, and 3D-fallback
      behavior continues to hold after the re-style.

## Out of Scope

| Feature | Reason |
|---------|--------|
| Changing the color palette or accent | Direction is locked: keep the existing dark ground + single accent; adopt layout only |
| Changing typefaces | Keep the existing display/body/mono fonts; only their scale/weight/tracking may change |
| New content, projects, or copy sections | This is a re-composition of existing content, not new material |
| Adopting the reference's light theme, template/testimonial/blog sections | Explicitly rejected; only structural/typographic patterns are borrowed |
| New 3D models or scene content | The scene is reused as-is; only its composition relative to the name changes |
| Contact form / backend / CMS | Unchanged from 001's scope |

## User Stories

### P1: A name-led, type-as-spine opening

- As a first-time visitor, I want the opening to be dominated by the name with the
  interactive scene composed through it, so that I instantly grasp whose site this
  is and feel the craft in the first frame.
- **Why P1:** The first impression is the entire reason for the re-style; without
  it the change has no payoff.
- **Independent Test:** Load the home page on desktop; the name is the single
  largest element and the interactive scene visibly overlaps its letterforms while
  both stay recognizable.

**Acceptance Criteria:**

- [x] AC-001: WHEN the home page loads THEN the site SHALL present a dedicated
      opening panel in which the name is rendered as the single largest visual
      element on screen.
- [x] AC-002: WHEN the opening panel is shown on a device that can run the
      interactive scene THEN that scene SHALL visually overlap the oversized name
      (foreground subject in front of the letterforms) while both remain
      recognizable.
- [x] AC-003: WHEN the opening panel renders THEN small editorial "runner" labels
      (such as a year/monogram and a "since"-style marker) SHALL appear pinned to
      the panel's corners.
- [x] AC-004: WHEN a primary navigation control targets the opening panel THEN
      that panel SHALL be a real, reachable in-page destination (no dead link).

### P1: A single consolidated floating navigation

- As a visitor, I want one clear, compact navigation control, so that the chrome
  feels intentional and never competes with the opening statement.
- **Why P1:** The consolidated nav is a defining part of the editorial look and
  directly affects the first impression.
- **Independent Test:** On load, navigation appears as one centered floating
  control (not links spread edge-to-edge); it never covers the opening identity
  text; every link still works by mouse and keyboard.

**Acceptance Criteria:**

- [x] AC-005: WHEN the page loads THEN navigation SHALL be presented as a single,
      centered, floating control rather than links distributed across the full
      viewport width.
- [x] AC-006: WHEN the floating navigation is shown THEN it SHALL NOT obscure the
      opening panel's primary identity text at any supported viewport size.
- [x] AC-007: WHEN a visitor operates the navigation by mouse or keyboard THEN all
      links SHALL remain reachable, focus SHALL be visibly indicated, and each link
      SHALL resolve to its correct destination.

### P1: A focused mission-statement beat

- As a visitor, I want a single quiet, centered statement between the opening and
  the capabilities, so that I get one clear line about what this person does before
  the detail begins.
- **Why P1:** This "breath" beat is a core part of the editorial rhythm being
  adopted and gives the page a deliberate cadence.
- **Independent Test:** Scroll past the opening panel; before the capabilities
  section a single centered short statement appears with generous surrounding
  space.

**Acceptance Criteria:**

- [x] AC-008: WHEN the visitor scrolls past the opening panel and before the
      capabilities section THEN the site SHALL present a single, centered, short
      statement passage surrounded by generous negative space.

### P2: Editorial typographic hierarchy & accent discipline

- As a visitor, I want headings and accents to feel like an editorial system, so
  that the whole page reads as considered rather than templated.
- **Why P2:** Elevates cohesion across all sections, but the P1 opening carries the
  primary impression.

**Acceptance Criteria:**

- [x] AC-009: WHEN display headings render THEN they SHALL use a larger, heavier,
      tighter editorial treatment than the pre-re-style baseline.
- [x] AC-010: WHEN the accent color is used THEN it SHALL appear only for emphasis
      and interaction, never as broad background fills — preserving the
      single-light-source discipline.

### P1: Preserve existing guarantees (no regressions)

- As any visitor (reduced-motion, no-WebGL, mobile, keyboard, screen-reader), I
  want the site to keep working exactly as well as before, so that the re-style
  costs no one their experience.
- **Why P1:** A re-style that breaks accessibility or fallback is a net loss
  regardless of how it looks.
- **Independent Test:** Re-run the existing behaviors — reduced motion, disabled
  3D, mobile layout, keyboard nav — against the re-styled build; all still hold.

**Acceptance Criteria:**

- [x] AC-011: WHEN reduced motion is requested THEN any new opening-panel motion
      (pinning, scroll-scrubbing, parallax, character-level animation) SHALL be
      disabled and the panel SHALL render statically while all content stays
      accessible.
- [x] AC-012: WHEN the interactive scene cannot run THEN the opening panel SHALL
      fall back to a static visual that still pairs with the oversized name and
      leaves the section fully usable.
- [x] AC-013: WHEN viewed on a small screen THEN the oversized name, floating
      navigation, corner labels, and statement beat SHALL adapt to a single-column,
      touch-friendly layout with no horizontal scroll.
- [x] AC-014: WHEN the re-styled site is viewed THEN all content present before the
      re-style (name, title, tagline, capabilities, work, contact, footer) SHALL
      remain present and readable.
- [x] AC-015: WHEN the oversized opening and its fonts load THEN visible layout
      shift SHALL stay minimal (no jarring reflow of the name or scene).

## Edge Cases

- WHEN the interactive scene fails to initialize THEN the oversized name SHALL
  still render and the static fallback SHALL compose with it (never an empty gap).
- WHEN fonts load late THEN the oversized name SHALL not cause a large reflow that
  shifts surrounding content.
- WHEN the viewport is very short (landscape phone) THEN the floating navigation and
  the opening identity text SHALL not overlap or clip.
- WHEN a pointer is unavailable (touch-only) THEN the opening composition SHALL
  present a sensible static default without depending on hover.
- WHEN a screen reader traverses the opening THEN the name, title, and statement
  SHALL be exposed as text and the decorative corner labels and scene SHALL not
  add noise or trap focus.
- WHEN JavaScript is disabled THEN the name, title, statement, and contact
  information SHALL remain readable.

## Success Criteria

- [x] On desktop, the name is unambiguously the largest element on first paint and
      the interactive scene overlaps it.
- [x] A viewer can describe the opening as "editorial / type-led" rather than
      "bio beside a picture."
- [x] Reduced-motion, no-WebGL, keyboard, and mobile visitors retain a fully usable
      experience with no new barriers.
- [x] No content that existed before the re-style is missing afterward.
- [x] The site builds and deploys successfully with the re-style in place.

## Open Questions

- Exact runner-label copy (year, "engineering since" year, monogram) — draft from
  existing profile content; confirm the "since" year during Design.
- Whether the consolidated navigation keeps all three destinations inline on the
  smallest screens or collapses one behind a compact affordance — decide in Design
  against the no-obscuring and touch-target rules.

## Notes

- This is a re-composition of existing sections, not new content. The authoritative
  identity/content already lives in the project's content layer and is reused
  verbatim.
- Direction was fixed with the user on 2026-08-14: keep the current dark,
  single-accent palette and existing fonts; adopt only editorial layout/typographic
  patterns from the selected reference. Run as a full spec→design→tasks pipeline.
- Inputs prepared for this feature: the reference-site analysis and a
  design-intelligence style addendum (both under feature 001's inputs), which
  reconcile the shipped visual system against older prose docs.

## Baseline

### Current Behavior

- The home page opens directly into a two-column section: a text bio on one side
  and the interactive scene on the other. There is no dedicated name-dominant
  opening panel; the large name treatment exists only as an unused capability.
- Navigation is a full-width bar with links spread to the left and right of a
  centered mark, fixed to the top.
- Sections follow one another without a distinct single-statement "breath" beat
  between the opening and the capabilities.

### Gaps / Limitations

- The first frame reads as conventional; the name is not the dominant element and
  the scene sits beside rather than within the statement.
- A primary navigation destination points at an opening anchor that does not exist,
  a latent dead link.
- The layout does not yet express the editorial cadence (oversized type as spine,
  corner runner labels, consolidated nav, statement beat) the user asked for.
