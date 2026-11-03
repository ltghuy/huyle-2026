---
slug: owl-eye-glance
completed: 2026-11-03
---

# Summary: The hero owl glances with its eyes instead of swaying

## What Changed

The shipped GLB had every part joined into one mesh, so the eyes couldn't move on their own. `group_owl_eyes.mjs` puts `Pupil_*`, `Highlight_*` and `HighlightSm_*` under `Gaze_L` and `Gaze_R` in the owner's source model. Then `gltf-transform optimize` runs without flattening, which would undo the grouping, and with `--simplify-error 0.001` (the default 0.0001 gave 520 KB). The new file is 143 KB against 159 KB before.

`owl-scene.ts` wraps each gaze node in a pivot 0.315 units behind the pupil centre, which is roughly the centre of curvature of the white at its front, and turns it by up to 0.22 rad. That keeps the pupils sliding along the eye instead of sinking into it or floating off it. The motion is a `tanh`-shaped sine with a 6 s period, so the eyes move fairly quickly and then rest on each side.

## Files Modified

| File | Change |
|------|--------|
| apps/learn-english/public/models/graduate-owl.glb | rebuilt with separate gaze nodes |
| .artifacts/features/learn-english/021-graduate-owl/designs/group_owl_eyes.mjs | new grouping script, with the optimise command |
| apps/learn-english/src/components/home/owl-scene.ts | gaze pivots and glance; body sway removed |
| apps/learn-english/src/components/home/owl-showcase.tsx | `look` option |
| .artifacts/features/learn-english/021-graduate-owl/spec.md | AC-003, AC-005 and the GLB note |
| .agents/knowledge.md | gaze nodes and `--flatten false` |

## Patterns Discovered

`gltf-transform optimize` flattens and joins by default. To animate a part of a model, group it first and pass `--flatten false`.

## Follow-Up

None.
