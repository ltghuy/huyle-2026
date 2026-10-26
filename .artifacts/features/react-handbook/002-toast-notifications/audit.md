---
id: "002"
feature: toast-notifications
audited: 2026-10-06
result: passed
---

# Audit: Toast / Notification System

Evidence from a production build (`next build && next start`) in headless Chrome, plus the user's UAT sign-off for the motion criteria (AC-005, AC-006).

| Target | Classification | Evidence |
|--------|----------------|----------|
| G1: One call raises a toast anywhere; survives navigation | Met | `toast.*` is a module-level API used from demo handlers and promise callbacks; a toast stayed visible from the practice page → another practice → the overview |
| G2: Exact, fair timing (±100 ms of unpaused time) | Met | See SC1: max error 5 ms over 11 toasts |
| G3: Every toast announced; errors more urgently | Met | Polite region text for success/info/warning/loading, assertive region for errors, re-announced on in-place update (tasks.md notes) |
| G4: Every behavior tunable from the demo | Met | Controls for all four types, action, async save with latency/failure rate, burst, dismiss all, position, duration, max visible; all exercised through the UI only |
| SC1: ±100 ms across 10 toasts incl. hover, focus and hidden pauses | Met | 11 timed toasts; pauses: hover 25 ms, tab hidden 1501 ms, keyboard focus (F8) 999 ms. Unpaused time 5001–5005 ms for every toast; max error 5 ms |
| SC2: 50-toast burst: no long task > 50 ms, none lost | Met | 50 unique toasts shown and dismissed, ≤ max visible at once, 0 long tasks |
| SC3: No serious/critical a11y issues with toasts visible | Met | axe-core 4.10: 0 serious, 0 critical; 1 moderate `region` (pre-existing sidebar wrapper from 001) |
| SC4: Full demo from controls in under 2 minutes | Met | Every behavior is one click or one control change; the scripted walkthrough of all behaviors ran in well under 2 minutes of interaction |
| SC5: Toasts persist and stay on time across navigation | Met | Dismissed at 5020 ms after navigating twice |

## Known minor issues (not blocking)

- Verified by code inspection only: 30 s promise timeout, empty-title guard, failing action → error toast, reduced-motion handling.
- axe `region` (moderate) carried over from feature 001.
