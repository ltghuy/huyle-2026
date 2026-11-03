---
slug: owl-model-preload
completed: 2026-11-03
---

# Summary: Preload the hero owl's GLB

## What Changed

`OwlShowcase` calls React's `preload` for the GLB, so the server-rendered home page asks for it at low priority. It won't compete with the page's critical resources. On idle the component runs `fetch(OWL_MODEL_URL)` and `import("./owl-scene")` together and passes the `ArrayBuffer` to `mountOwlScene`, which parses it with `GLTFLoader.parseAsync`. The URL moved from `owl-scene.ts` to `owl-showcase.tsx`.

On the dev server the GLB used to start at about 600 ms, after the three.js chunk. It now starts at 70 ms, initiated by the preload link, and no second request appears. The console shows no "preloaded but not used" warning, and the owl renders as before.

## Files Modified

| File | Change |
|------|--------|
| apps/learn-english/src/components/home/owl-showcase.tsx | preload, parallel model fetch, `OWL_MODEL_URL` |
| apps/learn-english/src/components/home/owl-scene.ts | takes `model: ArrayBuffer`, `parseAsync` |
| .agents/knowledge.md | preload must match the fetch's mode and credentials |

## Patterns Discovered

A `preload` with `as: "fetch"` is reused only when the later `fetch` has the same mode and credentials. A same-origin `fetch()` defaults to `cors` + `same-origin`, which matches `crossOrigin: "anonymous"`.

## Follow-Up

None.
