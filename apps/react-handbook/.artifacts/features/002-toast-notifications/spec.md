---
id: "002"
feature: toast-notifications
type: greenfield
scope: large
status: to-review
branch: main
created: 2026-10-06
---

# Feature: Toast / Notification System

## Overview

Practice 1 of the playground. The learner wants to build, from scratch, the
transient notification system that almost every app needs: short messages
that appear in a corner of the screen, stack, time out, can carry an action,
and can track a slow operation from "in progress" to its result. It's a good
exercise because it combines app-wide state, timers that pause and resume,
queueing, positioning and motion, and accessibility announcements in one
small surface.

The system is **app-wide**: once it exists, any part of the playground,
including later practices such as file upload or the multi-step form, can
raise a toast, and toasts survive navigation between practices. The practice
page demonstrates it with demo controls that exercise every behavior.

Cross-practice rules from feature 001 apply (core logic hand-built, demo data
from the project's own mock endpoints, explanation panel + demo controls).

## Goals

- [ ] Any part of the playground can raise a toast with one call, and the toast stays visible across navigation between practices.
- [ ] Auto-dismiss timing is exact and fair: a toast is visible for its full duration of *unpaused* time, within ±100 ms.
- [ ] Screen reader users are told about every toast, with errors announced with higher urgency than other types.
- [ ] The demo page lets the learner trigger and tune every behavior (types, actions, async, queue size, duration, position, bursts) without editing code.

## Out of Scope

| Feature | Reason |
|---------|--------|
| Swipe / drag to dismiss | Not selected; close button, Escape and timeout cover dismissal |
| Collapsed "deck" stacking that expands on hover | List + queue chosen instead |
| Toast history / notification center | Toasts are transient by design |
| Persisting toasts across a full page reload | Toasts belong to the current session only |
| Rich content (images, custom markup, progress bars) | Text title + optional description and one action keep the practice focused |
| Sound or browser/system notifications | Different problem space |

## User Stories

### P1: Raise a typed toast

- As a learner using the playground, I want to raise a success, error, info, or warning toast so that users get immediate, recognizable feedback.
- **Why P1:** This is the core of the practice; everything else builds on it.
- **Independent Test:** On the practice page, trigger one toast of each type and confirm each appears in the default corner with its own icon, color, and text, and that the non-error ones disappear after about 5 seconds.

**Acceptance Criteria:**

- [x] AC-001: WHEN a toast is raised with a type and a title (and optionally a description) THEN system SHALL show it in the current position within 100 ms, with an icon and color specific to its type and the type also conveyed in text for assistive technology.
- [x] AC-002: WHEN a success, info, or warning toast without an action is shown THEN system SHALL dismiss it automatically after the configured duration (default 5 seconds).
- [x] AC-003: WHEN an error toast is shown THEN system SHALL keep it visible until the user dismisses it.
- [x] AC-004: WHEN the user activates a toast's close button THEN system SHALL dismiss that toast immediately; every toast SHALL have a close button with an accessible name.
- [ ] AC-005: WHEN a toast appears or is dismissed THEN system SHALL animate it in and out (enter from the edge it is anchored to, exit by fading), without moving any page content outside the toast area.
- [ ] AC-006: WHEN a toast is dismissed THEN the remaining toasts SHALL move smoothly into the freed space rather than jumping.

### P1: Queue with a maximum visible count

- As a learner, I want only a limited number of toasts on screen with the rest waiting their turn so that bursts never flood the screen.
- **Why P1:** Without a limit, the first burst of activity covers the page and makes the system unusable.
- **Independent Test:** Set the max visible count to 3, fire 8 toasts, and confirm that 3 show at once, the others appear one by one as space frees up, and none are lost.

**Acceptance Criteria:**

- [x] AC-007: WHEN more toasts are raised than the max visible count (default 3) THEN system SHALL show the newest-allowed set and hold the rest in a first-in, first-out queue.
- [x] AC-008: WHEN a visible toast is dismissed and the queue is not empty THEN system SHALL show the next queued toast, and its auto-dismiss timer SHALL start only when it becomes visible.
- [x] AC-009: WHEN toasts are queued THEN system SHALL show a "+N more" indicator next to the visible toasts.
- [x] AC-010: WHEN the user chooses "Dismiss all" THEN system SHALL dismiss every visible and queued toast.

### P1: Accessible announcements and keyboard access

- As a screen reader or keyboard user, I want toasts announced and reachable so that I get the same feedback as everyone else.
- **Why P1:** Accessibility is a core requirement of every practice, and toasts are a classic accessibility trap.
- **Independent Test:** With a screen reader on, raise an info toast and an error toast and confirm both are read out (the error interrupting); press F8 and confirm focus lands on the newest toast; press Escape and confirm it closes.

**Acceptance Criteria:**

- [x] AC-011: WHEN an info, success, or warning toast appears THEN system SHALL announce its type, title and description politely (without interrupting current speech).
- [x] AC-012: WHEN an error toast appears THEN system SHALL announce it assertively (interrupting current speech).
- [x] AC-013: WHEN a queued toast becomes visible THEN system SHALL announce it at that moment, not when it was queued.
- [x] AC-014: WHEN toasts are visible and the user presses F8 THEN system SHALL move focus to the newest toast; WHEN no toasts are visible THEN F8 SHALL do nothing.
- [x] AC-015: WHEN a toast has focus and the user presses Escape THEN system SHALL dismiss it and move focus to the next toast, or, if none remain, back to the element that had focus before F8.
- [x] AC-016: WHEN a toast appears THEN system SHALL NOT take focus away from what the user is doing.

### P2: Action toast

- As a learner, I want a toast to offer one action such as "Undo" so that users can react to what just happened.
- **Why P2:** A common real-world need, but the system is already useful without it.

**Acceptance Criteria:**

- [x] AC-017: WHEN a toast is raised with an action label THEN system SHALL show an action button with that label.
- [x] AC-018: WHEN the user activates the action THEN system SHALL run the associated behavior once and dismiss the toast.
- [x] AC-019: WHEN a toast has an action THEN system SHALL keep it visible until the user acts or dismisses it (no auto-dismiss).
- [x] AC-020: WHEN the demo's "Delete item + Undo" flow is used THEN the demo SHALL remove an item, raise an Undo toast, and restore the item if Undo is chosen.

### P2: Track an async operation

- As a learner, I want one toast to follow a slow operation from "in progress" to success or failure so that users see a single, updating message instead of two.
- **Why P2:** Shows a realistic pattern (saving to a server) on top of the core system.

**Acceptance Criteria:**

- [x] AC-021: WHEN an async operation is tracked THEN system SHALL show a loading toast with a busy indicator that doesn't auto-dismiss while the operation is pending.
- [x] AC-022: WHEN the operation succeeds THEN system SHALL update the same toast in place to a success toast (new title/description) and start its auto-dismiss timer.
- [x] AC-023: WHEN the operation fails THEN system SHALL update the same toast in place to an error toast with the failure message, which stays until dismissed.
- [x] AC-024: WHEN the demo's "Save (simulated request)" button is used THEN the demo SHALL send a real request to the project's mock endpoint, whose latency and failure rate are set in the demo controls.
- [x] AC-025: WHEN a tracked toast updates THEN system SHALL announce the new state.

### P2: Pause timers when attention is elsewhere

- As a user, I want toasts to wait while I'm reading them, focusing them with the keyboard, or away from the tab so that I don't miss them.
- **Why P2:** Important for fairness and WCAG timing guidance, but builds on the P1 timers.

**Acceptance Criteria:**

- [x] AC-026: WHEN the pointer hovers over the toast area THEN system SHALL pause all visible toasts' timers, and resume each with its remaining time when the pointer leaves.
- [x] AC-037: WHEN keyboard focus moves into the toast area THEN system SHALL pause all visible toasts' timers, and resume them with their remaining time when focus leaves.
- [x] AC-027: WHEN the browser tab becomes hidden THEN system SHALL pause all timers and resume them with their remaining time when the tab is visible again.
- [x] AC-028: WHEN a timer is paused THEN system SHALL show a visual cue on the toast (its remaining-time indicator stops).

### P2: Positions and demo controls

- As a learner, I want to change where toasts appear and tune their behavior live so that I can see how the system reacts.
- **Why P2:** Needed to make the practice explorable; the system works with defaults alone.

**Acceptance Criteria:**

- [x] AC-029: WHEN the user picks one of six positions (top or bottom × left, center, or right) THEN system SHALL move visible and future toasts to that position, with the newest toast nearest the screen edge.
- [x] AC-030: WHEN the user changes the duration (1 to 15 seconds) or max visible count (1 to 6) in demo controls THEN system SHALL apply it to toasts raised afterwards (duration) and immediately (max visible).
- [x] AC-031: WHEN the user triggers "Burst (10 toasts)" THEN system SHALL raise 10 mixed toasts at once, exercising the queue.
- [x] AC-032: WHEN the viewport is narrower than a tablet THEN system SHALL show toasts full-width (with side margins) at the top or bottom edge of the chosen position.

### P2: Merge duplicates

- As a user, I want repeated identical messages merged so that repeated clicks don't flood the screen.
- **Why P2:** Polishes the burst behavior.

**Acceptance Criteria:**

- [x] AC-033: WHEN a toast is raised with the same type, title, and description as a toast that is visible or queued THEN system SHALL not create a new toast but show a count on the existing one ("×2", "×3", …) and restart its timer.
- [x] AC-034: WHEN two toasts differ in type, title, or description THEN system SHALL treat them as separate toasts.

### P3: Available everywhere in the playground

- As a learner, I want other practices to raise toasts and have them survive navigation so that the system behaves like a real app-wide service.
- **Why P3:** The design must allow it from day one, but only later practices will use it.

**Acceptance Criteria:**

- [x] AC-035: WHEN a toast is visible and the user navigates to another practice or the overview THEN system SHALL keep the toast and its timer running.
- [x] AC-036: WHEN code outside the toast practice raises a toast THEN system SHALL show it with the current position and settings.

## Edge Cases

- WHEN a title or description is very long THEN system SHALL wrap the text and cap each toast at a readable width, never overflowing the viewport.
- WHEN a toast is raised with an empty title THEN system SHALL reject it without showing anything and report the mistake to the developer.
- WHEN an action's behavior fails THEN system SHALL still dismiss the toast and SHALL NOT crash the page; the demo SHALL show an error toast describing the failure.
- WHEN a tracked operation is still pending and the user navigates away THEN system SHALL keep the loading toast and still update it when the operation settles.
- WHEN a tracked operation hasn't settled after 30 seconds THEN system SHALL turn the toast into an error ("Timed out") that stays until dismissed.
- WHEN a toast's duration is changed while it is visible THEN system SHALL keep that toast's original duration (new settings apply to new toasts).
- WHEN the max visible count is lowered below the number currently shown THEN system SHALL move the oldest extra toasts back to the front of the queue instead of dismissing them.
- WHEN the user prefers reduced motion THEN system SHALL show and hide toasts without sliding (instant or fade only).
- WHEN the queue grows very large (100+ toasts) THEN system SHALL keep the page responsive and keep the "+N more" count accurate.
- WHEN a duplicate of a queued (not yet visible) toast is raised THEN system SHALL increase its count without changing its place in the queue.
- WHEN the page's own demo crashes THEN system SHALL keep already-visible toasts working (the toast area is outside the demo's error boundary).

## Success Criteria

- [ ] Auto-dismiss fires within ±100 ms of the configured duration of unpaused time, measured across 10 toasts including hover, keyboard-focus and tab-hidden pauses.
- [ ] A burst of 50 toasts raised in one go causes no long main-thread task over 50 ms, and all 50 are eventually shown and dismissed with none lost.
- [ ] Zero serious or critical issues in an automated accessibility audit of the practice page with toasts visible.
- [ ] Every toast type, the action, the async flow, the queue, all six positions, and duplicate merging can be demonstrated from the demo controls alone, in under 2 minutes.
- [ ] Toasts raised on the practice page remain visible and on time after navigating to another practice.

## Open Questions

- None. All gray areas are resolved in [decisions.md](decisions.md).

## Notes

- Decisions from discovery are recorded in [decisions.md](decisions.md).
- The explanation panel for this practice should cover: why the toast area is a live region and why polite vs assertive, why timers must store remaining time rather than restart, queue vs max visible, and in-place updates for async operations.
