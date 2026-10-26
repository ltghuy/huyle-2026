---
id: "009"
feature: accessible-modal
created: 2026-10-07
---

# Decisions: Accessible Modal

Decisions on gray areas and ambiguities resolved during discussion.

## Resolved

### Foundation

- **Question:** Hand-built dialog, native dialog element, or both?
- **Decision:** Hand-built (dialog semantics, focus trap, inert background, scroll lock, focus restore, Escape), with the delete confirmation also built on the native dialog element as a comparison.
- **Rationale:** Practices the hard parts while showing what the platform now provides.
- **Caveats:** The native comparison is a single scenario, not a second implementation of every scenario.

### Scenarios

- **Question:** Which dialogs does the demo include?
- **Decision:** All four: destructive confirmation (alert dialog, "ask and wait" API), edit form with an unsaved-changes guard, stacked dialogs, long scrolling content.
- **Rationale:** Each exercises a different failure mode.
- **Caveats:** Makes the feature Complex scope.

### Closing, motion, phones

- **Question:** Backdrop click, animation, phone layout, focus fallback?
- **Decision:** All four: backdrop click closes (configurable, never for confirmations or forms with edits), fade + scale animation with exit before removal and none under reduced motion, a bottom sheet on phones, and a focus fallback when the opener is gone.
- **Rationale:** Matches production expectations.
- **Caveats:** Swipe-to-dismiss on the sheet is out of scope.

### Reuse

- **Question:** Practice-only or the playground's shared modal?
- **Decision:** App-wide, like the toast service: one host mounted in the playground shell, opened from anywhere.
- **Rationale:** Later practices (multi-step form, data grid) need dialogs.
- **Caveats:** It is the second intended exception to "practices don't touch the shell", after the toaster.

### Toasts while a dialog is open

- **Question:** Toasts live behind the dialog; making the background unreachable would hide them from screen readers and block their actions. Keep them reachable?
- **Decision:** Yes: toasts stay visible above the backdrop, announced and clickable; Tab still stays inside the dialog (agent default, not asked).
- **Rationale:** A toast raised by a dialog action (e.g. "Saved") must not be silenced.
- **Caveats:** Toast actions are reachable by pointer and by the toaster's F8 shortcut (focus may move into a toast and back), not by Tab; Escape closes the dialog only when focus is in it.

## Tentative

None.
