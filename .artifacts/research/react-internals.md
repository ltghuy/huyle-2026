---
topic: react-internals
researched_at: 2026-10-13
version: "React 19.2.8 / react-dom 19.2.8"
sources_hash: "n/a"
ttl_days: 90
keywords:
  - react-element
  - fiber
  - reconciliation
  - effects
  - transitions
---

# React internals (19.2)

> Researched: 2026-10-13, from node_modules sources and measurements in the page

## Key Information

- Production element: `{ $$typeof: Symbol.for("react.transitional.element"), type, key, ref, props }`; `jsx === jsxs` in production (react/cjs/react-jsx-runtime.production.js).
- Fiber tags from react-dom-client getComponentNameFromFiber: 0 Function, 1 Class, 3 HostRoot, 4 Portal, 5 HostComponent, 6 Text, 7 Fragment, 8 Mode, 9 Consumer, 10 Context, 11 ForwardRef, 12 Profiler, 13 Suspense, 14 Memo, 15 SimpleMemo, 16 Lazy, 22 Offscreen, 26 HostHoistable, 27 HostSingleton, 31 Activity.
- Containers hold the HostRoot fiber at `__reactContainer$<random>`; `stateNode.current` flips between two HostRoot copies per commit (measured #1 → #56 → #1).
- Effect timing (measured): click → layout effects then passive effects inside the commit, before rAF; timer → passive effects after the frame; transition → urgent isPending render, frame, then transition render and commit.

Sources: https://react.dev/learn/render-and-commit · https://react.dev/learn/preserving-and-resetting-state · https://react.dev/reference/react/useDeferredValue · https://legacy.reactjs.org/docs/reconciliation.html · node_modules/react/cjs, node_modules/react-dom/cjs
