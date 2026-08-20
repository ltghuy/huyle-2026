---
id: 003
feature: webgl-globe-gallery
type: brownfield
scope: medium
status: done
branch: feature/editorial-restyle
created: 2026-08-20
---

# Feature: WebGL Photo-Globe Gallery ("Off the clock")

> **ℹ BASELINE / AS-BUILT.** This spec was written **after** the feature shipped,
> to document the gallery's current behaviour (it appeared in no earlier spec).
> Acceptance criteria are marked `[x]` because they describe what already ships.
> Source of truth remains the code: `src/components/sections/Gallery.client.tsx`,
> `GalleryScene.client.tsx`, and `src/content/gallery.ts`.

## Overview

"Off the clock" is the personal-photo section of the portfolio — a set of frames
from life away from the keyboard (a self-portrait and the cat, Bông). Rather than
a flat grid, it presents the photos as an **interactive WebGL globe**: the images
float on an inner sphere *inside* a rotating green lat/long **wireframe vector
cage**, standing on a receding perspective floor grid, à la
`jesperlandberg.com`. The visitor grabs and spins the globe on both axes; it
carries momentum and idles with a slow drift; hovering a photo runs a water
ripple through it. An editorial overlay names the focused photo and hints the
drag affordance.

The section is progressively enhanced: the live scene mounts only when WebGL and
motion are both available; otherwise it degrades to a native horizontal
scroll-snap row of the same photos. It reuses the site's dark-green `#0b1510` +
lime `#d7f24a` palette and its mono "runner" label style, so it reads as part of
the same editorial system.

## Goals

- [x] Present the personal photos as a memorable, interactive 3D centrepiece
      rather than a conventional grid — cohesive with the site's editorial,
      single-accent aesthetic.
- [x] Make exploration obvious and tactile: drag to spin, with momentum, a gentle
      idle drift, and a per-photo ripple on hover.
- [x] Read as a *vector globe* — a thin green lat/long wireframe cage with the
      photos suspended inside it, sitting on a green perspective floor grid.
- [x] Never break the page: degrade to a static, accessible photo row under
      reduced motion, without WebGL, or without JS, and hold every a11y guarantee.

## Out of Scope

| Item | Reason |
|------|--------|
| Changing the palette, fonts, or overall site chrome | Reuses the established dark-green + lime system and mono runner labels as-is |
| A lightbox / full-screen photo viewer | The globe is a browse/impression piece, not a detail viewer |
| Per-photo titles, captions, or metadata beyond `alt` | Content model is just `{ src, alt }` (`src/content/gallery.ts`) |
| Uploading / managing photos at runtime, CMS, backend | Photos are static assets under `public/assets/gallery/` |
| The intro-vortex / smooth-scroll / scroll-portrait layers | Separate concerns; not part of this section |

## User Stories

### P1: An interactive photo globe centrepiece

- As a visitor, I want the personal photos shown as a rotating 3D globe I can
  spin, so that the section feels crafted and invites exploration.
- **Why P1:** The globe *is* the feature; the whole section's impression depends
  on it.
- **Independent Test:** On a WebGL-capable desktop with motion allowed, scroll to
  the gallery: photos are suspended inside a spinning wireframe sphere on a grid
  floor, and it can be dragged.

**Acceptance Criteria:**

- [x] AC-001: WHEN the gallery mounts on a device where WebGL and motion are both
      available THEN the photos SHALL be presented as tiles distributed over a
      sphere, rendered full-bleed to the section's width.
- [x] AC-002: WHEN the globe is shown THEN the photos SHALL sit on an inner sphere
      *inside* an outer lat/long wireframe cage (the photos float within the
      cage, not on its surface).
- [x] AC-003: WHEN photo tiles are placed THEN they SHALL be spread evenly (no
      pole-clustering) as upright, rounded 4:3 cards facing outward, cycling
      through the available photos when there are more tiles than photos.
- [x] AC-004: WHEN a tile rotates toward the globe's silhouette or to the far
      hemisphere THEN it SHALL fade out / be culled, so the far side reads as the
      back of a real globe rather than showing reversed images.

### P1: Draggable exploration with momentum and idle drift

- As a visitor, I want to grab and spin the globe and have it feel physical, so
  that browsing the photos is playful.
- **Why P1:** Interaction is the point of choosing a globe over a static grid.
- **Independent Test:** Drag horizontally and vertically — the globe rotates on
  both axes, keeps spinning briefly after release, then settles into a slow
  drift; it never flips upside-down.

**Acceptance Criteria:**

- [x] AC-005: WHEN the visitor drags on the scene THEN the globe SHALL rotate on
      both the vertical (yaw) and horizontal (pitch) axes following the pointer.
- [x] AC-006: WHEN a drag is released with velocity THEN the globe SHALL coast to
      a stop (momentum with friction), and WHEN left alone THEN it SHALL rotate
      with a gentle idle drift.
- [x] AC-007: WHEN the globe is pitched THEN the vertical tilt SHALL be clamped so
      it cannot flip over the poles.
- [x] AC-008: WHEN the pointer hovers a photo tile THEN a water-ripple SHALL run
      through that tile from the cursor position and ease back out on leave.
- [x] AC-009: WHEN the scene is interactive THEN the cursor SHALL indicate a grab
      affordance (grab / grabbing) over the scene.

### P1: Graceful, accessible fallback

- As a visitor without WebGL, with reduced-motion enabled, or without JS, I want
  to still see the photos, so that the section is never empty or broken.
- **Why P1:** Progressive enhancement and accessibility are non-negotiable site
  guarantees.
- **Independent Test:** With `prefers-reduced-motion: reduce` (or WebGL disabled,
  or JS off), the gallery shows a horizontal scroll-snap row of the same photos;
  no canvas, no motion.

**Acceptance Criteria:**

- [x] AC-010: WHEN WebGL is unavailable OR `prefers-reduced-motion: reduce` is set
      OR JavaScript is disabled THEN the gallery SHALL render a native horizontal
      scroll-snap row of the same photos instead of the WebGL scene.
- [x] AC-011: WHEN any photo is rendered (globe or fallback) THEN it SHALL carry
      descriptive `alt` text from the content model.
- [x] AC-012: WHEN the live scene is loading THEN a lightweight themed loading
      indicator SHALL be shown in its place (no layout jump).

### P2: Editorial overlay (index + caption + drag cue)

- As a visitor, I want a small label telling me which photo is focused and that I
  can drag, so that the interaction is discoverable and the section feels
  editorial.
- **Why P2:** Enhances discoverability and cohesion, but the globe works without
  it.

**Acceptance Criteria:**

- [x] AC-013: WHEN the visitor hovers a photo tile THEN an overlay SHALL show that
      photo's index as `NN / NN` (accent) and its caption, updating to the hovered
      photo; before any hover it defaults to the first photo.
- [x] AC-014: WHEN the scene is interactive THEN a "drag to explore" affordance
      SHALL be shown with an SVG cue (not an emoji), styled with the site's mono
      "runner" label system.
- [x] AC-015: WHEN the overlay is shown THEN it SHALL be non-interactive
      (pointer-events: none) so it never intercepts the drag gesture.

### P2: Vector-globe aesthetic on a perspective grid

- As a visitor, I want the globe to read as a thin green wireframe on a receding
  grid floor, so that it matches the site's neon-on-dark editorial look.
- **Why P2:** Carries the visual identity; independent of the core interaction.

**Acceptance Criteria:**

- [x] AC-016: WHEN the globe renders THEN it SHALL show a thin lat/long wireframe
      sphere (latitude rings + longitude meridians) tinted to the accent green,
      faint and see-through, with the near lines occluded by the opaque photos.
- [x] AC-017: WHEN the scene renders THEN a green perspective floor grid SHALL sit
      below the globe, receding toward the horizon and fading with distance into
      the dark-green background (the globe floats above it).

## Non-Functional Requirements

- [x] NFR-001 (a11y): The section preserves the site's accessibility and
      reduced-motion guarantees — the fallback row is fully keyboard/scroll
      accessible, all images have `alt`, and no motion runs under reduced-motion.
- [x] NFR-002 (performance / GPU hygiene): One geometry is shared across all
      tiles; geometries and materials are disposed on unmount; no geometry or
      allocation happens inside the render loop (reused scratch vectors).
- [x] NFR-003 (SSR): The WebGL scene is a client-only dynamic import
      (`ssr: false`) mounted from a Client Component, so the page still prerenders
      static (Next 16 forbids `ssr:false` in Server Components).
- [x] NFR-004 (color fidelity): Photo textures are shown as-authored
      (`NoColorSpace`, no lighting), so the images are not tinted or darkened.

## Current Implementation (as-built map)

| Concern | Where | Notes |
|---------|-------|-------|
| Section shell, heading, fallback, overlay, capability gate | `src/components/sections/Gallery.client.tsx` | `usePrefersReducedMotion` + `useWebGLAvailable` gate; `ScrollRow` fallback; `dynamic(ssr:false)` of the scene; editorial overlay + `DragCue` SVG |
| WebGL scene (globe, cage, grid, drag, camera) | `src/components/sections/GalleryScene.client.tsx` | `Globe`, `WireframeGlobe`, `GridFloor`, `DragController`, `CameraRig`; ripple + rounded-corner fragment shader; `onActive` → caption |
| Photo content | `src/content/gallery.ts` | `GalleryImage = { src, alt }`; static assets in `public/assets/gallery/` |
| Palette / mono label tokens | `src/app/globals.css` | dark green `#0b1510` + lime `#d7f24a`; accent green wireframe/grid; `--font-mono` runner labels |

**Key tuning constants** (in `GalleryScene.client.tsx`, values current at capture):
`TILE_COUNT 16`, `SPHERE_R 2.6` (cage) / `PHOTO_R 0.66×` (inner photo sphere),
`TILE_H 0.92` (4:3), wireframe `WIRE_LAT 9` × `WIRE_MERIDIANS 18`, camera
`FOV 45` / `FILL_V 0.9` / `CAM_LIFT 1.9`, interaction `DRAG_SPEED 0.006` /
`FRICTION 0.94` / `IDLE_SPIN 0.0016` / `MAX_PITCH 1.15`. These are visual dials,
not contract — the ACs above describe behaviour, not exact numbers.
