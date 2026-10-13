---
id: 030
feature: react-internals
created: 2026-10-13
---

# Technical Design: Inside React

## Scope

Page `/under-the-hood/react-internals`, five topics; every demo uses the
site's own React 19.2.8 (production build in production). Each live sample
app mounts in its own root (`createRoot` on a container the demo owns), so the
page's tree is never inspected or disturbed.

## Research Summary

- Production `jsx`/`jsxs` (react/cjs/react-jsx-runtime.production.js) return `{ $$typeof: Symbol.for("react.transitional.element"), type, key, ref, props }`; key is stringified; `jsx` and `jsxs` are the same function in production (static-children checks are dev-only). Dev elements add `_owner`, `_store`, `_debug*`.
- Fiber tags (react-dom-client getComponentNameFromFiber): 0 FunctionComponent, 3 HostRoot, 5 HostComponent, 6 HostText, 7 Fragment, 8 Mode, 10 Context, 11 ForwardRef, 13 Suspense, 14 Memo, 15 SimpleMemo, 26 HostHoistable, 27 HostSingleton, 31 Activity.
- `createRoot(container)` stores the HostRoot fiber at `container.__reactContainer$<random>`; its `stateNode` is the FiberRoot whose `.current` points to the committed HostRoot; each commit swaps `current` with its `alternate` (double buffering). DOM nodes carry `__reactFiber$<random>`.
- Function component hooks: `fiber.memoizedState` is a linked list (`next`); a state hook has a `queue`; an effect hook's `memoizedState` has `create`/`deps`; a ref hook's is `{ current }`.

## Decisions

| Decision | Rationale |
|---|---|
| Topic 01 compiles the reader's JSX with the 027 compiler (automatic runtime), strips the runtime import, and runs it with React's real `jsx`/`jsxs`/`Fragment` passed in | Real element objects without a second compiler |
| Element printer: own enumerable keys not starting with `_`; functions as `[Function Name]`, symbols by description; depth/size caps | Same view in dev and prod; bounded |
| Component-not-called proof: sample components increment a counter object passed into the sandbox | Observable, not asserted |
| Fiber walker reads internals defensively (`__reactContainer$` key search, null checks), labelled "React 19.2 internals" | Internals change between versions |
| Current/alternate: give each fiber object an id via WeakMap; show the HostRoot's id before/after commits | Makes double buffering visible |
| Reconciliation: MutationObserver(subtree, childList, characterData, attributes) on the sample root; summarize records after `flushSync` + microtask | Records exactly what React did to the DOM |
| Phases: log `render X` in bodies, `layout effect X`, `effect X`, `DOM updated` via a callback ref/MutationObserver, and `next frame` via rAF; trigger by click (discrete) or `setTimeout` (default priority) | Measured order instead of asserted |
| Scheduling: SlowList (N items × busy ms), input latency = event time stamp → rAF after commit; modes: urgent vs `useDeferredValue`; count renders (body) vs commits (effect) | Real concurrent behavior |

## Component Design

| Component | File |
|---|---|
| route, catalog, content | app route, catalog.ts, src/handbook/react-internals/content.tsx |
| element printer + runner | elements.ts |
| ElementsDemo | elements-demo.tsx |
| fiber walker | fibers.ts |
| FibersDemo (+ sample app) | fibers-demo.tsx |
| useIsolatedRoot hook | isolated-root.tsx |
| ReconcileDemo (+ scenarios) | reconcile-demo.tsx |
| PhasesDemo | phases-demo.tsx |
| SchedulingDemo | scheduling-demo.tsx |

## Requirements Traceability

| Requirement | Component |
|---|---|
| AC-001..003 | ElementsDemo, elements.ts |
| AC-004..006 | FibersDemo, fibers.ts |
| AC-007..009 | ReconcileDemo |
| AC-010..011 | PhasesDemo |
| AC-012..013 | SchedulingDemo |

## Test Strategy

Browser (Puppeteer, production build): each AC's interaction and measured outputs; record the actual phase orders and write the page text from them; axe light/dark, 360 px, keyboard. Gate: typecheck, lint, build.

## Considerations

- Running reader JSX: the compiled code runs in the page with only `jsx`, `jsxs`, `Fragment` and a call counter in scope, like a REPL on the reader's own input.
