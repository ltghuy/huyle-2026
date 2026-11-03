---
slug: owl-eye-glance
status: done
branch: main
created: 2026-11-03
---

# Quick Task: The hero owl glances with its eyes instead of swaying

## What

The 3D owl in the home hero stops swaying its whole body. It stands still facing the learner, and its pupils glance left, rest, glance right and rest, about every 6 seconds. Changes feature 021 AC-003 and AC-005.

## Files

- apps/learn-english/public/models/graduate-owl.glb: rebuilt from the owner's GLB with each eye's pupil and highlights as their own node
- .artifacts/features/learn-english/021-graduate-owl/designs/group_owl_eyes.mjs: groups those nodes before optimising
- apps/learn-english/src/components/home/owl-scene.ts: turns the gaze nodes around a pivot behind each eye; no body sway
- apps/learn-english/src/components/home/owl-showcase.tsx: passes `look` instead of `sway`

## Expected Outcome

The owl's body stays put. Its pupils slide across the whites and stay on them from any angle. With reduced motion the pupils stay still. Dragging still turns the owl.

## Quality Gates

- pnpm lint
- pnpm typecheck
- pnpm test
