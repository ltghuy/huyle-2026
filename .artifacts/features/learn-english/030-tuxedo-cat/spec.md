---
id: 030
feature: tuxedo-cat
type: brownfield
scope: medium
status: done
branch: main
created: 2026-11-08
---

# Feature: The tuxedo cat replaces the graduate owl

## Overview

Feature 021 made the owner's purple graduate owl the app's companion: a flat SVG in four moods in about 30 places, and the 3D model in the home hero. The owner has designed a new character, a black-and-white tuxedo cat with the same mortarboard and orange "ENGLISH A·B·C" book (`designs/build_tuxedo_cat.py` → `tuxedo_cat.glb`, turnaround in `designs/tuxedo-cat-v2-*.png`). The cat replaces the owl everywhere, in the same places and moods.

## Goals

- [x] The owner's tuxedo cat is the only character in the app, recognisable from the 3D design at every size
- [x] The home page shows the real 3D cat without loading more than the owl did

## Out of Scope

| Feature | Reason |
|---------|--------|
| New places or moods for the companion | Only the character changes; 021's placements and moods stay |
| Animating the 3D cat beyond the tail wag (blinking, eye glance) | The owner asked for the tail wag instead of 021's eye glance; the flat irises made the glance sink one pupil |
| Changing the cat's design | It is the owner's; the SVG follows the model's parts and palette |
| A name for the cat | Not given yet; labels call it "Mèo" |

## User Stories

### P1: The cat everywhere the owl was

- As a learner, I want one character across the app so that it feels like the same companion on every page
- **Independent Test:** open the study pages, an empty state, the score screen and the home streak card: each shows the cat in the mood the owl had

**Acceptance Criteria:**

- [x] AC-001: WHEN the app shows the companion THEN system SHALL draw the cat as an inline SVG front view with the model's parts and palette (black fur `#2F2C3A`, white blaze, muzzle, bib and paws, pink inner ears and nose, yellow-green eyes with dark slit pupils and highlights, white whiskers, purple mortarboard with a gold tassel, the orange book reading "ENGLISH A·B·C" held in both paws, a tail curling up on one side), in four moods: happy (as the model), cheer (paws raised, closed happy eyes, sparkles), think (pupils looking up, a "?"), sleepy (closed eyes, "z z"); decorative unless labelled; the same gentle idle bob only when motion is allowed
- [x] AC-002: WHEN a page showed the owl THEN system SHALL show the cat in the same mood and at the same size, and no owl remains in the app or its labels

### P2: The 3D cat on the home page

- As a visitor, I want to see the cat in 3D on the home page so that the character feels alive

**Acceptance Criteria:**

- [x] AC-003: WHEN the home page has rendered THEN system SHALL load an optimised copy of the owner's cat GLB in the hero, in the owl's place and size, standing still and facing the learner while its tail wags left and right, over and over, staying in view (owner's request 2026-11-08, replacing 021's eye glance); the learner can drag to turn it. The model file stays under 200 KB
- [x] AC-004: WHEN WebGL is unavailable, the model fails to load, or it is still loading THEN system SHALL show the SVG cat in the same place and size, so the layout does not move
- [x] AC-005: WHEN the learner prefers reduced motion THEN system SHALL keep the 3D cat's tail still (dragging still works)

## Edge Cases

- WHEN the hero scrolls out of view THEN system SHALL stop rendering frames (unchanged from 021)
- WHEN the screen is 360 px wide THEN system SHALL size the cat down with no horizontal scroll

## Success Criteria

- [x] The 3D code and model load only on the home page, after first render; the page stays a static shell
- [x] Lint, typecheck, tests and build pass; the cat looks right in light and dark at 1440 and 390 px

## Open Questions

- None

## Notes

- Requested on 2026-11-08 with the owner's `build_tuxedo_cat.py`, `tuxedo_cat.glb` (3.2 MB, unoptimised) and four turnaround renders. The owner chose to replace the whole mascot, not only the 3D model.
- Supersedes feature 021's owl drawing and model (021 AC-001, AC-003; the eye glance becomes a tail wag); 021's placements (AC-002, AC-006), fallback (AC-004) and reduced motion (AC-005) carry over to the cat.
- The cat is black, so on the dark theme it needs the light disc or an outline to stay visible; check both themes.

## Baseline

### Current Behavior

- The purple graduate owl appears as an SVG in the study page heroes, empty and error states, the score screen, Arena, sign-in prompts and the home streak card, and as a 3D model in the home hero; its screen-reader labels say "Cú"

### Gaps / Limitations

- The owl is no longer the owner's character

## Verification

- 2026-11-08: `pnpm lint`, `pnpm typecheck`, `pnpm test` (1276 passed) and `pnpm build` pass; `/` stays static.
- AC-001: the four moods rendered at 260 px on white and on `#0e0e10`; the lighter rim keeps the black fur visible on dark. `mascot.test.tsx` covers the moods, the size ratio, the label and the book text.
- AC-002: no `Owl`, "owl" or "Cú" is left in `src/` or `e2e/`; every placement imports `Mascot` with the same mood and size as before.
- AC-003: `public/models/tuxedo-cat.glb` is 61 KB (owner's file 3.2 MB). Hero captured with Playwright (SwiftShader) at 1440 px light and dark and at 390 px: the cat stands in the owl's place; five frames 0.3 s apart show the tail swinging out to the right and back, in view the whole time.
- AC-004: unchanged from 021; the SVG cat sits under the canvas until the model is ready.
- AC-005: by code: with reduced motion `wag` is false and the tail stays at `TAIL_REST`; not checked in a browser.

## Audit

2026-11-08. All goals and success criteria met.

| Target | Result | Evidence |
|--------|--------|----------|
| G1: the cat is the only character, recognisable at every size | Met | No `Owl`, "owl" or "Cú" in `src/` or `e2e/`; the SVG rendered at every size the app uses (32, 36, 40, 56, 72, 88, 112 px) on white and on `#0e0e10` keeps the cap, the black and white coat and the orange book readable; at 32 px the sleepy "z" is barely visible |
| G2: the real 3D cat on the home page, loading no more than the owl | Met | `tuxedo-cat.glb` is 61 KB against the owl's 143 KB; on `/` the browser requests it once (the preload and the fetch share one download) and draws the canvas |
| SC1: 3D code and model only on the home page, after first render; the page stays static | Met | `/credits` and `/hard-words` request no `.glb` and draw no canvas; `mascot-scene.ts` (three.js) is imported only dynamically by `MascotShowcase`, on idle; the build lists `○ /` |
| SC2: gates pass; the cat looks right in light and dark at 1440 and 390 px | Met | lint, typecheck, `pnpm test` (1277) and `pnpm build` pass; hero captured at 1440 px light and dark, 390 px light and dark, with no horizontal scroll (`scrollWidth` 390) |

Observation, not a failure: at 390 px the cat's left ear tip passes just under the floating sign-in pill.
