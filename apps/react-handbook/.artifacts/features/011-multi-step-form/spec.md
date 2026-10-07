---
id: "011"
feature: multi-step-form
type: greenfield
scope: complex
status: done
branch: main
created: 2026-10-07
---

# Feature: Multi-Step Form

## Overview

Practice 10 of the playground. The learner wants to build a long form as a
wizard: one step at a time, each step checked before moving on, free
movement back to earlier steps, and a review of everything before sending.
It's a good exercise because the simple version ("an index and a big
object") breaks as soon as real requirements arrive: later steps that
depend on earlier answers, a refresh that loses twenty minutes of typing,
a browser Back button that leaves the form instead of going one step back,
and a server that rejects something the browser accepted.

The demo is a job application: personal details, the role applied for,
work experience (a list of entries), questions specific to the chosen
role, a cover letter and salary expectations, then a review and submit
against the project's mock API. Answers can add or remove steps, the draft
survives a reload, each step has its own address that the browser's Back
and Forward buttons move through, and the server re-checks everything,
including whether the email has already been used for an application.
Cross-practice rules from feature 001 apply (core logic hand-built, no
form library, explanation guide + demo controls).

## Goals

- [x] An applicant can complete the application step by step, never moving past a step with invalid answers, and can go back to any completed step without losing anything.
- [x] The steps adapt to earlier answers: the progress indicator, navigation and review always match the steps that currently apply, and answers to steps that no longer apply are not submitted.
- [x] Nothing typed is lost to a reload, closing the tab, or browser Back/Forward; the applicant returns to the same step with the same answers.
- [x] The server is the final authority: it re-checks every answer, and anything it rejects is shown on the step and field it belongs to.
- [x] The learner can see how the form works: its current values, which fields were touched, and which errors exist, as they change.

## Out of Scope

| Feature | Reason |
|---------|--------|
| Attaching files (CV, portfolio PDF) | Practice 6 covers uploads; a picked file can't be kept in a saved draft, which would blur this practice's draft lesson |
| Accounts, sign-in, or a saved-applications list | The demo is one anonymous application; drafts are kept per browser |
| Saving drafts on the server | Drafts stay in the browser; the server only receives the final submission |
| Editing an application after it's submitted | Submission is final; "Start a new application" begins again |
| Multiple languages or locales | Not the practice's subject |
| Using a third-party form library or the UI kit's form components that handle state and validation | Practice rule: the form engine is hand-built |

## User Stories

### P1: Fill in the application one step at a time

- As an applicant, I want to answer a few questions per step and only move on when they're valid so that a long form feels manageable and mistakes are caught where I made them.
- **Why P1:** Steps, per-step validation, back navigation and review are the practice's core.
- **Independent Test:** Open the practice, press Next on an empty first step: the errors appear and the step doesn't change. Fill it in, continue through every step, go back to step 1, change the name, return to Review: the new name is shown. Submit: a confirmation with an application number appears.

**Acceptance Criteria:**

- [x] AC-001: WHEN the practice opens without a draft THEN system SHALL show the first step (Personal details) with a progress indicator listing every applicable step, the current one marked, and "Step 1 of N".
- [x] AC-002: WHEN the applicant presses Next THEN system SHALL check every field of the current step; IF any is invalid THEN system SHALL stay on the step, show each error next to its field, show a summary of the errors at the top of the step that links to each field, and move focus to the summary.
- [x] AC-003: WHILE a field has not been visited THEN system SHALL NOT show its error; WHEN the applicant leaves a field (or presses Next) THEN system SHALL show its error, and from then on SHALL update that error as the applicant types.
- [x] AC-004: WHEN the current step is valid and Next is pressed THEN system SHALL go to the next applicable step and move focus to that step's heading, announcing "Step X of N: name".
- [x] AC-005: WHEN the applicant presses Back THEN system SHALL go to the previous applicable step without checking the current one and keep everything typed on it.
- [x] AC-006: WHEN the applicant selects a completed step in the progress indicator THEN system SHALL go to it; steps after the first incomplete one SHALL NOT be selectable.
- [x] AC-007: WHEN the Experience step is shown THEN the applicant SHALL be able to add, edit, remove and reorder up to 5 entries (company, title, start month, end month or "I work here now"); at least one entry SHALL be required unless "I don't have work experience yet" is checked.
- [x] AC-008: WHEN the Review step is shown THEN system SHALL list every answer grouped by step, each group with an Edit action that opens that step; WHEN the applicant edits from Review and the step is valid THEN a "Back to review" action SHALL return to Review directly.
- [x] AC-009: WHEN Submit is pressed on Review THEN system SHALL re-check every applicable step; IF one is invalid THEN system SHALL open the first invalid step with its errors shown instead of submitting.
- [x] AC-010: WHEN the application is accepted THEN system SHALL show a confirmation with the application number and a summary, clear the draft, and offer "Start a new application".
- [x] AC-011: WHILE the submission is in progress THEN system SHALL disable Submit, show progress, and ignore further presses so the application is sent once.

### P1: Steps that depend on earlier answers

- As an applicant, I want to see only the questions that apply to me so that I don't wade through steps for other roles.
- **Why P1:** Conditional steps are what turn "an index into an array of steps" into a real wizard problem.
- **Independent Test:** Choose Engineering: an "Engineering questions" step appears in the progress indicator. Change the role to Sales: that step disappears, "Step X of N" updates, and Review no longer shows the engineering answers.

**Acceptance Criteria:**

- [x] AC-012: WHEN the role is Engineering THEN system SHALL include an Engineering step (primary languages, years of experience, optional code profile link); WHEN the role is Design THEN system SHALL include a Design step (required portfolio link, tools); WHEN the role is Sales THEN no role-specific step SHALL be included.
- [x] AC-013: WHEN the applicant answers that they need visa sponsorship THEN system SHALL add a Work authorization step (current country of residence, current status, earliest start possible); WHEN they change the answer back THEN the step SHALL be removed.
- [x] AC-014: WHEN the set of applicable steps changes THEN the progress indicator, "Step X of N", Next/Back order and Review SHALL update immediately to match.
- [x] AC-015: WHEN a step stops applying THEN its answers SHALL be kept only for the rest of the visit (so switching back restores them) and SHALL NOT be validated, shown on Review, saved in the draft, or submitted.

### P1: Keep my progress

- As an applicant, I want my answers and my place kept when I reload or come back later so that I never have to type them twice.
- **Why P1:** Losing a long form is the most common wizard failure.
- **Independent Test:** Fill in two steps, reload: the same step and answers come back with a "Draft restored" notice. Press "Start over" and confirm: the form is empty on step 1.

**Acceptance Criteria:**

- [x] AC-016: WHEN the applicant changes an answer THEN system SHALL save the draft (answers, the furthest step reached, and when it was saved) in this browser within 1 second, and show "Saved just now" / "Saved N min ago".
- [x] AC-017: WHEN the practice opens and a valid draft exists THEN system SHALL restore every answer and the step the applicant was on (or the first incomplete step if that one is no longer reachable) and show a "Draft restored" notice with the save time and a "Start over" action.
- [x] AC-018: WHEN "Start over" is chosen THEN system SHALL ask for confirmation and, on confirm, delete the draft and return to an empty step 1.
- [x] AC-019: WHEN a saved draft is from an older format THEN system SHALL convert it; WHEN it is unreadable or invalid THEN system SHALL discard it, start empty, and say why.
- [x] AC-020: WHEN the draft can't be saved (storage blocked or full) THEN system SHALL warn once that progress will only last for this visit and SHALL warn before the page is left with unsaved answers.

### P1: Every step has its own address

- As an applicant, I want the browser's Back and Forward buttons and refresh to work step by step so that the wizard behaves like the rest of the web.
- **Why P1:** Browsers move by address; a wizard that ignores this loses users on the first Back press.
- **Independent Test:** Go from step 1 to step 3 with Next, press the browser Back button twice: step 1 with its answers. Press Forward: step 2. Copy the address of step 3 into a new tab without a draft: step 1 opens instead.

**Acceptance Criteria:**

- [x] AC-021: WHEN the step changes through Next, Back, the progress indicator or Edit THEN the page address SHALL change to identify that step, adding a browser history entry, without reloading the page.
- [x] AC-022: WHEN the browser's Back or Forward button is used THEN system SHALL show the step in the address, keeping all answers and moving focus to that step's heading.
- [x] AC-023: WHEN the address names a step that doesn't apply, doesn't exist, or comes after the first incomplete step THEN system SHALL show the furthest step allowed instead and replace the address (no extra history entry).
- [x] AC-024: WHEN the page is refreshed THEN system SHALL open the step in the address with the draft's answers.

### P1: The server checks everything

- As an applicant, I want problems the server finds to point me to the exact field so that I can fix them without guessing; as the company, I want no invalid application accepted, whatever the browser sends.
- **Why P1:** Browser checks can be bypassed; the server's answer is the one that counts.
- **Independent Test:** Type an email the server already has an application for: "An application with this email already exists" appears on the email field after a short pause. With "Server rejects a field" set in the demo controls, submit: the form opens the step of the rejected field with the server's message on that field.

**Acceptance Criteria:**

- [x] AC-025: WHEN the applicant pauses typing a valid-looking email (about half a second) or leaves the field THEN system SHALL ask the server whether it was already used, show "Checking…" while waiting, and show the server's answer on the field; only the answer for the latest value SHALL be shown.
- [x] AC-026: WHILE the email check is pending or has failed with a network error THEN Next on that step SHALL wait for the check (or retry it) rather than skip it; a taken email SHALL block Next.
- [x] AC-027: WHEN the application is submitted THEN the server SHALL validate every applicable step with the same rules as the browser plus the rules only it can check (email not already used), and SHALL accept nothing for steps that don't apply.
- [x] AC-028: WHEN the server rejects the submission with field errors THEN system SHALL show each error on its field, open the earliest step that has one, and show a summary; WHEN the server fails for another reason THEN system SHALL keep everything, show the error with Retry, and stay on Review.
- [x] AC-029: WHEN the server's rules and the browser's disagree (a server-only rule, or a tampered request) THEN the server's decision SHALL win: requests that fail its checks are rejected with each problem's step and field.

### P2: See how the form works

- As a learner, I want to watch the form's values, visited fields and errors change, and to break the server on purpose, so that I understand what the wizard is doing.
- **Why P2:** Practice pages explain and demonstrate; the wizard works without it.

**Acceptance Criteria:**

- [x] AC-030: WHILE the demo is shown THEN a form inspector SHALL show the current values, which fields were visited, current errors (browser and server), the applicable steps and the furthest step reached, updating live.
- [x] AC-031: WHILE the demo is shown THEN demo controls SHALL let the learner set server latency, choose a submission outcome (accept, reject a field, reject the email as taken, server error), fill the form with valid sample answers, and clear the draft.
- [x] AC-032: WHILE the practice is shown THEN an explanation guide SHALL describe the approach in the playground's guide format (what it is, key ideas, then read-more sections).

### P3: Comfortable on every device and with any input

- As an applicant on a phone or using only a keyboard or screen reader, I want the wizard to be just as usable so that the form doesn't exclude me.
- **Why P3:** Expected quality for every practice; the core works without the extra polish.

**Acceptance Criteria:**

- [x] AC-033: WHILE the page is narrower than a tablet THEN the progress indicator SHALL collapse to "Step X of N: name" with a progress bar, the navigation buttons SHALL stay reachable at the bottom of the step, and the page SHALL NOT scroll sideways.
- [x] AC-034: WHILE using only a keyboard THEN every action (fields, entry add/remove/reorder, progress steps, Edit, Next/Back/Submit) SHALL be reachable and operable, with Enter in a single-line field acting as Next.
- [x] AC-035: WHEN errors are shown THEN each field SHALL be programmatically tied to its error and marked invalid, required fields SHALL be marked as required, and error colors SHALL meet contrast in both themes.

## Edge Cases

- WHEN the applicant presses Next twice quickly THEN system SHALL advance one step only.
- WHEN the applicant changes the role after filling the role-specific step THEN the old role's step SHALL disappear and the new one SHALL start empty (or with answers from earlier in this visit), and the furthest step reached SHALL not include steps that are now incomplete.
- WHEN an answer on an earlier step changes so that a later completed step becomes invalid (e.g. the desired start date on the Role step moves before the earliest legal start given on the Work authorization step) THEN that later step SHALL show as needing attention and SHALL block Submit until fixed.
- WHEN an experience entry's end month is before its start month, or in the future THEN system SHALL show the error on the end month.
- WHEN the 5th experience entry is added THEN "Add entry" SHALL be disabled with the reason; WHEN "I don't have work experience yet" is checked THEN existing entries SHALL be kept for the visit but not validated or submitted.
- WHEN the email check returns after the applicant has already changed the email THEN that stale answer SHALL be ignored.
- WHEN the draft was saved in another tab after this one opened THEN the newest save SHALL win on the next load and this tab SHALL keep saving its own changes (no live sync between tabs).
- WHEN the draft holds a value the current rules reject (rules changed, or tampered storage) THEN the value SHALL be kept and shown with its error rather than silently dropped.
- WHEN the confirmation is shown and the browser Back button is pressed THEN system SHALL NOT reopen the submitted application's steps; it SHALL stay on the confirmation (or start a new empty application).
- WHEN the submission times out or the network drops THEN system SHALL treat it as a server failure (AC-028) and SHALL NOT clear the draft.
- WHEN JavaScript-free submission or very old browsers are used THEN behavior is not supported (stated in the guide).

## Success Criteria

- [x] A keyboard-only run completes the whole application (Engineering role with sponsorship, 2 experience entries) and submits it, with focus never lost to the page body.
- [x] Reloading on every step, and using browser Back/Forward across all steps, restores 100% of entered values and the expected step (0 differences in the form inspector).
- [x] Deep links to 100% of non-reachable steps (later than the first incomplete step, not applicable, unknown) land on the furthest allowed step without adding a history entry.
- [x] 0 invalid applications are accepted by the server: at least 20 tampered requests (missing steps, wrong types, out-of-range values, answers for steps that don't apply, a used email) are rejected, each with the step and field of every problem.
- [x] Every server-side field error appears on the correct step and field in 100% of tried cases.
- [x] Switching the role back and forth 10 times leaves Review, the draft and the submitted data containing only the current role's answers.
- [x] Zero serious or critical accessibility issues, in both themes and at phone width (360 px) with no sideways scrolling.

## Open Questions

- None. Domain, extras and validation approach were decided in discovery (see decisions.md).

## Notes

- Sample answers include "taken@example.com" style emails that the mock server treats as already used, so the email check can be tried without setup.
- The explanation guide should cover: why a wizard is one form split into steps (one set of values, rules per step), when to validate (visit, change, next, submit), conditional steps derived from answers rather than stored, why the step belongs in the address and how history entries are added or replaced, draft saving as untrusted input (versioned, validated, migrated), async field checks with stale-answer protection, sharing the same rules between browser and server and mapping server errors back to steps, focus management and error summaries for accessibility, and the trade-offs of a hand-built engine versus a form library.
