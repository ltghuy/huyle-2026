---
slug: owl-model-preload
status: done
branch: main
created: 2026-11-03
---

# Quick Task: Preload the hero owl's GLB

## What

The home hero's 3D owl loaded in series: once the browser was idle, the three.js chunk downloaded, and only then did the GLB fetch start. Preload the GLB at low priority with the page, and on idle fetch it in parallel with the chunk. Supports feature 021 AC-003.

## Files

- apps/learn-english/src/components/home/owl-showcase.tsx: `preload(…, { as: "fetch", fetchPriority: "low" })`, and fetches the model alongside `import("./owl-scene")`
- apps/learn-english/src/components/home/owl-scene.ts: `mountOwlScene` takes the model as an `ArrayBuffer` and parses it

## Expected Outcome

The home page HTML carries `<link rel="preload" href="/models/graduate-owl.glb" as="fetch" crossorigin fetchpriority="low">`. The model downloads once, together with the page, and the owl appears as soon as three.js is ready. Other pages don't load the model.

## Quality Gates

- pnpm lint
- pnpm typecheck
- pnpm test
