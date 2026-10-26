---
id: "011"
feature: multi-step-form
created: 2026-10-07
---

# Decisions: Multi-Step Form

Decisions on gray areas and ambiguities resolved during discussion.

## Resolved

### Domain

- **Question:** What does the wizard collect?
- **Decision:** A job application: personal details → role → experience (repeatable entries) → role-specific questions → cover letter and salary → review.
- **Rationale:** Mixes the hard cases in one realistic form: lists, conditional steps, cross-field rules, and an async server check (email already used).
- **Caveats:** No file attachments (see spec Out of Scope).

### Extras

- **Question:** Which extras beyond steps, per-step validation, back navigation and review?
- **Decision:** All four: conditional steps, draft save and resume, the step in the address with browser Back/Forward, and server validation (async email check plus full re-validation on submit, mapped back to steps and fields).
- **Rationale:** Each is a common real requirement that breaks the naive wizard.
- **Caveats:** Makes the feature Complex scope.

### Validation rules

- **Question:** How are validation rules defined?
- **Decision:** One schema per step, shared by the browser and the server, written with the project's existing validation library (Zod, already the trust-boundary tool). Form state, visited fields, error display, focus handling and the step engine are hand-built; no form library.
- **Rationale:** One source of truth for rules on both sides is the realistic pattern; the practice's hard parts (state, timing, steps, server mapping) stay hand-built.
- **Caveats:** Server-only rules (email already used) live only on the server and reach the browser through the async check and submission errors.

### Answers of steps that stop applying (agent default, not asked)

- **Question:** What happens to answers when a conditional step no longer applies?
- **Decision:** Kept in memory for the rest of the visit so switching back restores them, but never validated, shown on Review, saved in the draft, or submitted.
- **Rationale:** Switching a role by mistake shouldn't wipe typing, while the server and the draft only ever see answers that apply.
- **Caveats:** After a reload, answers for steps that didn't apply at save time are gone.

### Draft scope (agent default, not asked)

- **Question:** Where are drafts kept and do tabs sync?
- **Decision:** One draft per browser, saved locally; no server drafts and no live sync between tabs; the newest save wins on the next load.
- **Rationale:** Practice 9 already covers cross-tab sync; this practice focuses on save, restore, migrate and discard.
- **Caveats:** Two tabs editing at once overwrite each other's draft.

### Step address (agent default, not asked)

- **Question:** How does the address identify the step?
- **Decision:** The step is part of the practice's address (one practice keeps one route, per the playground rule); moving forward adds a history entry, corrections (unreachable or unknown step) replace it.
- **Rationale:** Back/Forward and refresh work per step without new routes for each step.
- **Caveats:** Exact address shape is a design choice.

## Tentative

None.
