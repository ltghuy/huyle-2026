---
id: "009"
feature: accessible-modal
type: greenfield
scope: complex
status: done
branch: main
created: 2026-10-07
---

# Feature: Accessible Modal

## Overview

Practice 8 of the playground. The learner wants to build, from scratch, a
modal dialog that keyboard and screen reader users can rely on: focus moves
into it, can't wander behind it, and returns to a sensible place when it
closes; Escape and the backdrop close it unless that would lose work; the
page behind can't be scrolled, clicked or read; dialogs can be stacked; and
it adapts to phones and to users who prefer less motion. Modals are one of
the most commonly broken widgets on the web, and every one of these points
has a well-known failure.

The demo shows four realistic scenarios (a destructive confirmation, an edit
form that protects unsaved changes, stacked dialogs, and a long scrolling
document), an event log that shows where focus went and why each dialog
closed, and the same confirmation built on the browser's native dialog
element for comparison. The result becomes the playground's shared modal
service, as the toast system did. Cross-practice rules from feature 001
apply (core logic hand-built, explanation guide + demo controls).

## Goals

- [x] Keyboard users can open, use and close every dialog without focus ever escaping it or getting lost, and land back where they started (or on a sensible fallback).
- [x] While a dialog is open, nothing behind it can be focused, clicked, scrolled or reached by a screen reader, and the page doesn't shift when it opens or closes.
- [x] Closing never loses work by accident: dismissals that would discard edits ask first, and confirmations can't be dismissed by a stray click.
- [x] Other practices can open dialogs, including a one-line "ask and wait for the answer" confirmation, with the same guarantees.
- [x] The learner can compare the hand-built dialog with the native one and see what the browser does for them.

## Out of Scope

| Feature | Reason |
|---------|--------|
| Non-modal dialogs, popovers, menus, tooltips | Different patterns (no inert background, no focus trap) |
| Drag to move or resize a dialog | Not needed for accessibility; rarely used on the web |
| Swipe-down to dismiss the phone sheet | Gesture handling is a separate practice; the sheet closes with its button, Escape or the backdrop |
| Routing dialogs to URLs (open on deep link, close on Back) | Practice-level navigation is handled by the playground shell |
| Using the shared modal in earlier practices | Earlier practices keep working as they are; adoption is up to later practices |

## User Stories

### P1: A dialog keyboard and screen reader users can trust

- As a keyboard or screen reader user, I want focus to move into a dialog, stay there, and come back when it closes so that I never lose my place.
- **Why P1:** This is the practice.
- **Independent Test:** Tab to "Delete project" and press Enter: the dialog opens, its title and description are announced, focus is on "Cancel". Tab and Shift+Tab cycle only through the dialog's controls; press Escape: the dialog closes and focus is back on "Delete project".

**Acceptance Criteria:**

- [x] AC-001: WHEN a dialog opens THEN system SHALL show it above a backdrop, expose it as a modal dialog named by its title and described by its description, and move focus inside it.
- [x] AC-002: WHEN a dialog opens THEN focus SHALL go to the element the dialog designates (the least destructive action for confirmations, the first field for forms, the title for long documents), else to the first focusable element, else to the dialog itself.
- [x] AC-003: WHILE a dialog is open, WHEN the user presses Tab on its last focusable element (or Shift+Tab on its first) THEN focus SHALL wrap to the first (or last) one, and focus SHALL never reach anything behind the dialog.
- [x] AC-004: WHILE a dialog is open THEN everything behind it SHALL be unreachable: not focusable, not clickable, hidden from assistive technology, and the page SHALL NOT scroll (wheel, touch, keyboard).
- [x] AC-005: WHEN a dialog opens or closes THEN page content behind it SHALL NOT move horizontally (no shift from the scrollbar disappearing) and the page scroll position SHALL be unchanged.
- [x] AC-006: WHEN the user presses Escape THEN system SHALL close the top dialog only, unless that dialog prevents it (see AC-012, AC-014); WHEN text is being composed in an input method THEN Escape SHALL NOT close the dialog.
- [x] AC-007: WHEN a dialog closes THEN focus SHALL return to the element that opened it; WHEN that element no longer exists or can't take focus THEN focus SHALL go to the fallback the dialog names, else to the practice's main heading, never to the page body.
- [x] AC-008: WHEN a dialog has a close (×) button THEN it SHALL be labelled "Close" and close the dialog like Escape does.

### P1: Confirm before destroying

- As a user about to delete something, I want a clear confirmation that a stray click can't dismiss so that I don't lose data by accident.
- **Why P1:** The most common modal in real apps; shows the alert-dialog variant.
- **Independent Test:** Click "Delete project" on a project row: the confirmation names the project; click the backdrop: nothing happens; press "Delete": the row disappears, a toast confirms it, and focus lands on the next project row (or the "New project" button when none are left).

**Acceptance Criteria:**

- [x] AC-009: WHEN the user asks to delete a project THEN system SHALL open a confirmation exposed as an alert dialog, with the destructive action visually marked and focus on "Cancel".
- [x] AC-010: WHEN the confirmation is open THEN clicking the backdrop SHALL NOT close it; Escape and "Cancel" SHALL close it without deleting.
- [x] AC-011: WHEN code elsewhere in the playground asks for a confirmation and waits THEN it SHALL receive "confirmed" or "cancelled" once the dialog closes, however it was closed.

### P1: Edit without losing work

- As a user editing a profile in a dialog, I want to be warned before my edits are thrown away so that closing by habit doesn't cost me my changes.
- **Why P1:** Shows dismissal rules that depend on state, and a dialog opened on top of a dialog.
- **Independent Test:** Open "Edit profile", change the name, press Escape: "Discard changes?" opens on top; choose "Keep editing": you're back in the form with your edit and focus on the field you left. Press Escape again and choose "Discard": both dialogs close and focus returns to "Edit profile".

**Acceptance Criteria:**

- [x] AC-012: WHEN the form has unsaved edits and the user presses Escape, clicks the backdrop, or presses Close/Cancel THEN system SHALL open a "Discard changes?" confirmation on top instead of closing.
- [x] AC-013: WHEN the user chooses "Keep editing" THEN system SHALL close only the confirmation and return focus to the element that had it in the form; WHEN the user chooses "Discard" THEN system SHALL close both and return focus to the original opener.
- [x] AC-014: WHEN the form is submitted with invalid fields THEN system SHALL keep the dialog open, show each error next to its field, and move focus to the first invalid field; WHEN it is valid THEN system SHALL save, close, and confirm with a toast.
- [x] AC-015: WHEN the form has no edits THEN Escape, the backdrop (if enabled) and Cancel SHALL close it immediately.

### P2: Stacked dialogs

- As a user, I want dialogs opened from dialogs to behave predictably so that I can find my way back out.
- **Why P2:** Builds on the core; real settings screens do this.

**Acceptance Criteria:**

- [x] AC-016: WHEN a dialog opens from another dialog THEN the lower dialog SHALL become unreachable like the page, and only the top dialog's backdrop SHALL be visible on top of it.
- [x] AC-017: WHEN the top dialog closes THEN the dialog below SHALL become usable again with focus on the control that opened the top one; closing continues one level at a time, at least three levels deep.

### P2: Long content

- As a user reading a long document in a dialog, I want it to scroll inside the dialog while its title and actions stay in view.
- **Why P2:** A common layout failure (dialogs taller than the screen).

**Acceptance Criteria:**

- [x] AC-018: WHEN a dialog's content is taller than the screen allows THEN the dialog SHALL fit within the viewport, keep its header and actions visible, and scroll its body only, without scrolling the page when the body reaches its end.
- [x] AC-019: WHEN the long document opens THEN focus SHALL be on its title so screen readers start reading at the top, and the scrollable body SHALL be reachable and scrollable with the keyboard.

### P2: Motion and phones

- As a user on a phone, or who prefers reduced motion, I want the dialog to fit my device and my preferences.
- **Why P2:** Polish that real products require.

**Acceptance Criteria:**

- [x] AC-020: WHEN a dialog opens or closes and the user doesn't prefer reduced motion THEN it SHALL fade and scale in (about 150–200 ms) and SHALL finish its exit animation before it is removed; focus SHALL return within one frame of closing starting, without waiting for the animation.
- [x] AC-021: WHEN the user prefers reduced motion (or the demo turns animations off) THEN dialogs SHALL appear and disappear without animation.
- [x] AC-022: WHEN the viewport is narrower than a phone breakpoint (or the demo forces it) THEN dialogs SHALL show as a full-width sheet attached to the bottom of the screen, no taller than the visible viewport (including when the on-screen keyboard is open), with all behaviors above unchanged.

### P2: Shared modal service

- As a later practice, I want to open dialogs and ask for confirmations from anywhere so that I don't rebuild this.
- **Why P2:** Reuse across the playground, decided in discussion.

**Acceptance Criteria:**

- [x] AC-023: WHEN any part of the playground opens a dialog or asks for a confirmation THEN it SHALL get every behavior above, and toasts raised while a dialog is open SHALL still be visible, announced and usable.
- [x] AC-024: WHEN the user navigates to another page while a dialog is open (e.g. browser Back) THEN system SHALL close every dialog, settle pending confirmations as "cancelled", and restore page scrolling.

### P3: Native comparison and demo controls

- As a learner, I want to see the same confirmation on the browser's native dialog and to tune the behaviors so that I understand what each part costs.
- **Why P3:** Teaching aid on top of working dialogs.

**Acceptance Criteria:**

- [x] AC-025: WHEN the learner opens the native comparison THEN system SHALL show the same delete confirmation built on the browser's native modal dialog, and the event log SHALL record the same events for it.
- [x] AC-026: WHILE the demo is shown THEN an event log SHALL list, newest first, each dialog opened (with where focus went), each close (with its reason: Escape, backdrop, button, confirm, navigation) and where focus returned, with a "Clear log" action.
- [x] AC-027: WHEN the learner changes "Backdrop click closes", "Animations" (on/off) or "Layout" (auto, dialog, sheet) THEN the next dialog opened SHALL use it.

## Edge Cases

- WHEN a dialog has no focusable elements THEN focus SHALL go to the dialog itself and Tab SHALL keep it there.
- WHEN the user presses the mouse inside the dialog, drags outside and releases over the backdrop (e.g. selecting text) THEN the dialog SHALL NOT close.
- WHEN a dialog is closed while its open animation is still running THEN it SHALL reverse/close cleanly without leaving the page locked.
- WHEN the same opener is activated twice quickly (double-click, key repeat) THEN only one dialog SHALL open.
- WHEN a confirmation is requested while another dialog is open THEN it SHALL stack on top.
- WHEN the browser window is resized from desktop to phone width with a dialog open THEN the dialog SHALL switch layout without closing.
- WHEN the page was already scrolled when the dialog opened THEN closing SHALL leave it at the same position.
- WHEN focus is moved out by assistive technology or a script THEN system SHALL bring it back into the top dialog.
- WHEN the last project is deleted THEN focus SHALL go to the "New project" button.

## Success Criteria

- [x] In every scenario, 50 consecutive Tab and Shift+Tab presses keep focus inside the top dialog 100% of the time.
- [x] Across every scenario and every close method, focus returns to the opener or the named fallback 100% of the time, never to the page body.
- [x] Opening and closing any dialog moves page content by 0 px and leaves the page scroll position unchanged.
- [x] With any dialog open, 0 elements behind it are focusable or clickable and 0 serious or critical accessibility issues are reported, in both themes.
- [x] Closing with an animation removes the dialog within 250 ms; with reduced motion, within one frame.
- [x] Unsaved edits are never lost without an explicit "Discard" (Escape, backdrop and Cancel each tested with edits).

## Open Questions

- None. Decisions are recorded in [decisions.md](decisions.md).

## Notes

- The explanation guide should cover: modal semantics (dialog vs alert dialog, label and description), initial focus choices, trapping focus vs making the rest inert, scroll locking without layout shift, returning focus (and what to do when the opener is gone), dismissal rules (Escape, backdrop with the press-inside-release-outside trap, unsaved changes), stacking, motion and reduced motion, phone sheets and the on-screen keyboard, and a comparison with the native dialog (what it gives for free and what it still lacks).
- The project list in the confirmation scenario is local demo data; deleting resets with a "Reset projects" action.
