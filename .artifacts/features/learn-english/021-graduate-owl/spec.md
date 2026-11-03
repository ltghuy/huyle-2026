---
id: 021
feature: graduate-owl
type: brownfield
scope: large
status: done
branch: main
created: 2026-11-03
---

# Feature: The graduate owl replaces Lửa

## Overview

Feature 020 gave Streak Daily a companion, Lửa (a flame). The owner has since designed the main character themselves: a purple graduate owl with a mortarboard and an orange "ENGLISH A·B·C" book, built as a 3D model (`designs/build_owl.py` → `graduate_owl.glb`, preview in `designs/graduate-owl-preview.png`). The owl replaces Lửa everywhere. It is drawn as a flat SVG for the small, mood-carrying spots, and the real 3D model turns slowly in the home page hero.

## Goals

- [x] The owner's owl is the only character in the app, recognisable from the 3D design at every size
- [x] The home page shows the real 3D owl without slowing the first render

## Out of Scope

| Feature | Reason |
|---------|--------|
| 3D on pages other than home | Heavy for small header spots; the SVG carries the moods there |
| Animating the 3D owl (blinking, waving) | The model has one pose; slow turning and dragging only |
| Changing the owl's design | It is the owner's; the SVG follows the model's parts and palette |

## User Stories

### P1: The owl everywhere Lửa was

- As a learner, I want one friendly character across the app so that it feels like the same companion on every page
- **Independent Test:** open the five study pages, an empty state and the home streak card: each shows the owl in a fitting mood

**Acceptance Criteria:**

- [x] AC-001: WHEN the app shows the companion THEN system SHALL draw the owl as an inline SVG front view with the model's parts and palette (purple body `#8E6EDF`, darker wings and ear tufts `#7B59D8`, lavender belly with chevrons, big white eyes with dark pupils and highlights, orange beak, pink cheeks, mortarboard with gold tassel, orange book reading "ENGLISH A·B·C" held in both hands, orange feet), in four moods: happy (as the model), cheer (wings raised, closed happy eyes, sparkles), think (eyes looking up, a "?"), sleepy (closed eyes, "z z"); decorative unless labelled; a gentle idle bob only when motion is allowed
- [x] AC-002: WHEN a page used Lửa (the five study page heroes, `EmptyState` with a mood, `ContentError`, the home streak card) THEN system SHALL show the owl in the same mood instead, and no flame remains

- [x] AC-006: WHEN a learner opens `/exercises` or `/profile`, or finishes an exercise set THEN system SHALL show the owl too: `/exercises` gets the compact hero with the owl (happy) and a thinking owl in its empty states and in "Bài này chưa đủ nội dung để luyện"; `/profile`'s hero shows a cheering SVG owl above the pill (no 3D there); the score screen shows the owl cheering at 70% correct or more, happy below (2026-11-03)

### P2: The 3D owl on the home page

- As a visitor, I want to see the owl in 3D on the home page so that the app's character feels alive

**Acceptance Criteria:**

- [x] AC-003: WHEN the home page has rendered THEN system SHALL load the 3D owl (an optimised copy of the owner's GLB) in the hero, swaying gently (about ±25°) so its face stays toward the learner; the learner can drag to turn it. Phones and tablets show it above the wordmark; from `lg` the hero splits, text on the left and the owl, larger (25 rem tall from `lg`, 14 rem on tablets, 12 rem on phones, with a little headroom), on the right on a soft disc with a floor shadow and a "Hello! Cùng học nhé" bubble (2026-11-03: a full slow spin showed its back half the time, and the centred layout left wide screens empty)
- [x] AC-004: WHEN WebGL is unavailable, the model fails to load, or it is still loading THEN system SHALL show the SVG owl in the same place and size, so the layout does not move
- [x] AC-005: WHEN the learner prefers reduced motion THEN system SHALL not sway the 3D owl (dragging still works)

## Edge Cases

- WHEN the hero scrolls out of view THEN system SHALL stop rendering frames
- WHEN the screen is 360 px wide THEN system SHALL size the owl down with no horizontal scroll

## Success Criteria

- [x] The 3D code and model load only on the home page, after first render; the page stays a static shell
- [x] Lint, typecheck, tests and build pass; the owl looks right in light and dark at 1440 and 390 px

## Open Questions

- The owl has no name yet; screen-reader labels call it "Cú" for now

## Notes

Requested on 2026-11-03 with the owner's `build_owl.py`, `graduate_owl.glb` and preview image. The owner chose "SVG everywhere + 3D on the home page". It supersedes feature 020's Lửa (020 AC-001's drawing); 020's placements (AC-002, AC-003, AC-005) keep working with the owl.

## Baseline

### Current Behavior

- Lửa, a flame SVG, appears in the study page heroes, empty and error states and the home streak card

### Gaps / Limitations

- Lửa is not the owner's character

## Verification

- 2026-11-03: `pnpm lint`, `pnpm typecheck`, `pnpm test` (899 passed; `src/components/mascot/owl.test.tsx` covers the moods, the label and the book text) and `pnpm build` pass; `/` stays static.
- The owner's GLB went through `@gltf-transform/cli optimize` (join, weld, simplify, meshopt): 1.63 MB → 159 KB (`public/models/graduate-owl.glb`), and it looks the same as the preview from the front and back.
- three.js loads as one lazy chunk (637 KB, 158 KB gzipped) that the home page's HTML doesn't reference; `/vocabulary` loads no three.js or model (0 requests).
- Browser: dark at 1568 px, the SVG owl shows in the five study page heroes, Từ khó's empty state (cheer) and the home streak card (sleepy); the 3D owl turns slowly in the home hero, drags to turn, and the lesson card title is still above the fold. 390 px light: no horizontal scroll (`scrollWidth` 375).
- Not checked in a browser: reduced motion (the code reads `prefers-reduced-motion` and turns auto-rotate off) and the no-WebGL fallback (the SVG stays when `hasWebGL()` is false or loading rejects).
- 2026-11-03 (AC-006): `/exercises` and `/profile` checked at 1568 px and 390 px (no horizontal scroll); the score screen is covered by the library test that finishes a set.
