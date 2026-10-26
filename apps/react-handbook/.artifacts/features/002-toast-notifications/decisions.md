---
id: "002"
feature: toast-notifications
created: 2026-10-06
---

# Decisions: Toast / Notification System

## Resolved

### Capabilities in scope

- **Question:** Which capabilities beyond basic toasts?
- **Decision:** Typed variants (success, error, info, warning), one action per toast, and async/loading toasts that update in place. Swipe-to-dismiss excluded.
- **Rationale:** Covers the most common real-world uses; swipe adds gesture work unrelated to the core problem.

### Stacking model

- **Decision:** Vertical list with a max visible count (default 3, adjustable 1–6) plus a first-in, first-out queue and a "+N more" indicator.
- **Rationale:** Predictable and easy to reason about; a collapsed deck is mostly animation work and harder to make accessible.

### Position

- **Decision:** Six positions (top/bottom × left/center/right), switchable in demo controls; default bottom-right.

### Reach

- **Decision:** App-wide: one toast area for the whole playground; any code can raise toasts; toasts survive navigation.
- **Rationale:** Matches the real-world architecture and lets later practices (file upload, multi-step form) reuse it.

### Timing

- **Decision:** 5-second default (1–15 s adjustable). Error toasts and toasts with an action never auto-dismiss.
- **Rationale:** Users can't miss errors or actions; aligns with WCAG 2.2.1 (timing adjustable).

### Pausing

- **Decision:** Timers pause on pointer hover over the toast area, while keyboard focus is inside it, and while the browser tab is hidden; they resume with the remaining time.
- **Rationale:** Keyboard focus pause was added after discussion: without it, a toast reached with F8 could vanish while focused (WCAG 2.2.2).

### Duplicates

- **Decision:** Identical toasts (same type, title, description) merge into one with a count, restarting its timer.

### Keyboard

- **Decision:** F8 moves focus to the newest toast; Escape dismisses the focused toast.
- **Rationale:** Established convention in popular toast implementations.

## Tentative

### Async timeout

- **Question:** What if a tracked operation never settles?
- **Tentative Decision:** After 30 seconds the loading toast becomes a sticky "Timed out" error.
- **Revisit when:** A later practice needs longer-running tracked operations.

### Branch

- **Tentative Decision:** Stay on `main`, as for feature 001.
- **Revisit when:** You want feature branches per practice.
