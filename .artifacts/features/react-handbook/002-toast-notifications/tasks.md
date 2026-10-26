---
id: "002"
feature: toast-notifications
created: 2026-10-06
---

# Tasks: Toast / Notification System

## Summary

Total: 10 | Completed: 10 | Remaining: 0

## Execution Plan

```
T001 ──> T002 ──> T003 ──> T004 ──┐
  │                                ├──> T007 ──> T008 ──> T009 ──> T010
  └──> T005 ──> T006 ──────────────┘
```

- T001 (store core) unblocks both the UI track (T002–T004) and the async track (T005 endpoint is independent; T006 needs the store).
- T005 is parallel-safe with T002–T004.
- T010 is the measured verification pass for the success criteria.

## Quality Gates

Run after each task or batch:

- `pnpm lint`
- `pnpm typecheck`
- `pnpm build` (end of each group)

## Tasks

### Toast service core

- [x] T001 [P] Build the toast store: types, settings, add/update/dismiss/dismissAll, FIFO queue with max visible (promote/demote), duplicate merge, timers with remaining time, pause-reason set, exit phase + removal, `useToastState()` with a constant server snapshot, empty-title guard
  - **Done when:** in a browser console session the store shows ≤ maxVisible toasts, promotes queued ones FIFO on dismissal, merges identical toasts with a count, auto-dismisses timed toasts and keeps error/action toasts, and pausing then resuming preserves the remaining time. -- VERIFIED

### Toast UI

- [x] T002 [B:T001] Build ToastItem: type icon + color + sr-only type text, title/description wrapping, count badge, close button, action button (guarded single run, failure → error toast), loading spinner, remaining-time bar with play-state, enter (`starting:`) / exit (opacity + grid-rows collapse) transitions with `transitionend` + fallback removal
  - **Done when:** each type renders distinctly in light and dark mode; enter slides from the anchored edge; exit fades and neighbours slide into place; the bar freezes while paused; under reduced motion there's no sliding and no bar. -- VERIFIED

- [x] T003 [B:T002] Build Toaster + Announcer: positioned region for six positions with newest-at-edge order, mobile full width, "+N more" and Dismiss all, hover/focus/visibility pause wiring, two live regions with announce-on-visible and on version change, F8 focus newest + Escape dismiss with focus restore
  - **Done when:** all six positions place toasts correctly; screen-reader live-region text matches each toast as it becomes visible (assertive for errors); F8 focuses the newest toast, Escape closes it and focus returns; a new toast never moves focus. -- VERIFIED

- [x] T004 [B:T003] Mount `<Toaster />` in the playground layout
  - **Done when:** a toast raised on one page stays visible, with its timer running, after navigating to another practice and the overview. -- VERIFIED

### Async flow

- [x] T005 [P] Build the mock save endpoint: Zod schema (latency 0–10000 ms, failRate 0–1), service with latency + random failure, thin route handler
  - **Done when:** `curl` shows 200 after the requested latency, 500 with "Simulated server failure" at failRate 1, 422 on out-of-range input and 400 on bad JSON. -- VERIFIED

- [x] T006 [B:T001] Add `toast.promise` with in-place loading → success/error updates and a 30 s timeout
  - **Done when:** one toast goes loading → success (then auto-dismisses) or loading → error (sticky); the toast id never changes; a never-settling promise becomes "Timed out" after 30 s. -- VERIFIED

### Practice page

- [x] T007 [B:T004,T006] Build the demo: controls (four type buttons, action toast, position, duration 1–15 s, max visible 1–6, latency, failure rate, Burst 10, Dismiss all) and stage (Delete + Undo list, Save button calling the endpoint through `toast.promise`)
  - **Done when:** every control changes the live app-wide toaster; Undo restores the deleted item; Save shows loading then success or error according to the failure rate. -- VERIFIED

- [x] T008 [B:T007] Write the explanation (live regions + polite vs assertive, remaining-time timers, queue vs max visible, in-place async updates, why no focus stealing) and add the route file + `built: true`
  - **Done when:** `/practices/toast-notifications` renders through its own route with the explanation; the sidebar and overview show it as Built (1 of 14). -- VERIFIED

### Verification

- [x] T009 [B:T008] Walk through all 37 ACs in a production build and mark them in spec.md
  - **Done when:** every AC has observed evidence; any failure is fixed or recorded. -- VERIFIED

- [x] T010 [B:T009] Measure the success criteria: timer accuracy over 10 toasts with pauses, a 50-toast burst with a long-task observer, axe-core with toasts visible, a 2-minute demo run, persistence across navigation
  - **Done when:** the measurements are recorded in tasks.md notes, ready for audit. -- VERIFIED

## Requirements Coverage

| Requirement | Tasks |
| ----------- | ----- |
| AC-001 | T001, T002 |
| AC-002 | T001 |
| AC-003 | T001 |
| AC-004 | T002 |
| AC-005 | T002 |
| AC-006 | T002 |
| AC-007 | T001 |
| AC-008 | T001 |
| AC-009 | T003 |
| AC-010 | T001, T003, T007 |
| AC-011 | T003 |
| AC-012 | T003 |
| AC-013 | T003 |
| AC-014 | T003 |
| AC-015 | T003 |
| AC-016 | T003 |
| AC-017 | T002 |
| AC-018 | T001, T002 |
| AC-019 | T001 |
| AC-020 | T007 |
| AC-021 | T006 |
| AC-022 | T006 |
| AC-023 | T006 |
| AC-024 | T005, T007 |
| AC-025 | T003, T006 |
| AC-026 | T001, T003 |
| AC-027 | T001, T003 |
| AC-028 | T002 |
| AC-029 | T003, T007 |
| AC-030 | T001, T007 |
| AC-031 | T007 |
| AC-032 | T003 |
| AC-033 | T001 |
| AC-034 | T001 |
| AC-035 | T004 |
| AC-036 | T001, T004 |
| AC-037 | T001, T003 |

## Verification Notes (production build, headless Chrome)

| Check | Result |
|-------|--------|
| Auto-dismiss, no pause | 5014 ms (target 5000 ± 100) |
| Hover pause (32 ms window) | 5008 ms unpaused; a multi-second hover held the toast with the bar `paused` |
| Tab hidden for 2 s | 7010 ms total → 5010 ms unpaused |
| Keyboard focus (F8) | focused toast held > 6 s; bar paused |
| Navigation persistence | toast kept across practice → practice → overview; dismissed at 5020 ms |
| Burst of 50 (5 × Burst) | 50 unique toasts shown, none lost, ≤ max visible at once, 0 long tasks > 50 ms |
| axe-core 4.10, toasts visible | 0 serious, 0 critical; 1 moderate `region` (pre-existing sidebar wrapper) |
| Endpoint | 200 after latency, 500 at failRate 1, 422 out of range, 400 bad JSON |
| Positions / mobile | six positions; 360 px: full width, 16 px margins, newest nearest edge, no horizontal scroll |
| Live regions | polite text per toast, assertive for errors, re-announced on in-place update |

Verified by code inspection only (no browser hook): 30 s promise timeout, empty-title guard, failing action → error toast, reduced-motion handling. AC-005/AC-006 (enter/exit/reflow motion) need a human eye: left for UAT.

Fixes made during verification: sr-only merge count, announcement punctuation ("Saving…."), unique burst labels so repeated bursts don't merge.
