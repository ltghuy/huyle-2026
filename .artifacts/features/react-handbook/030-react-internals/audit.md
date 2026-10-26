---
id: "030"
feature: react-internals
created: 2026-10-13
---

# Audit: Inside React: from JSX to DOM updates

## Goals

- [x] Five topics with working demos (elements, fibers, reconciliation, phases, scheduling), all exercised by a Puppeteer script on the production build with no console errors.
- [x] Every demo runs the shipped React 19.2.8 and reports what it did: real element objects (`$$typeof: Symbol(react.transitional.element)`, Badge called 0 times on creation, 2 on render); live fiber tree with hook state and the HostRoot swapping #1 → #56 → #1; DOM mutations recorded by a MutationObserver; measured phase orders; measured input latency. Internals are labelled as not public API.

## Success Criteria

- [x] Text matches measurements: element shape; effects before the next frame for a click and after it for a timer; transition renders urgently first; index keys misplace state (A=note for B), stable keys keep it; type change loses edited state, prop change keeps it; deferred list abandons renders (2 of 11) and cuts input latency (avg 23 → 8 ms, worst 86 → 15 ms).
- [x] axe clean light/dark at 1280 and 360 px with demos in their run states; no horizontal overflow.
- [x] typecheck, lint, build pass; Under the Hood shows 5 of 5 pages written, all pages 200 and hydrated.

## Notes

- Fixed after review: under `next dev` (Strict Mode) the isolated roots logged "createRoot() on a container that has already been passed to createRoot()" (deferred unmount + remount). `useOwnedRoot` now reuses the root and cancels the pending unmount; verified with no console errors on the dev server and unchanged results on the production build.
- Section complete: the unwritten-page fallback route was removed (noted in 026's spec).
- Measurements came from headless Chrome with background throttling disabled; numbers vary by machine, the orderings don't.
