---
slug: email-status-shift
status: done
branch: main
created: 2026-10-21
---

# Quick Task: Stop the email check from moving the Next button

## What

Reserve the line where the multi-step form shows the email check's status, so "Checking whether this email was already used…" appearing doesn't push the rest of the step down.

## Files

- src/practices/multi-step-form/fields.tsx

## Expected Outcome

Typing an email and pressing Next straight away moves to the next step on the first press. Before, the status line appeared between the press and the release, the button moved about 22 px, the release landed outside it and the press was lost. The new end-to-end suite (feature 036) found it.

## Quality Gates

Run after the change, before marking done:

- pnpm lint
- pnpm typecheck
- the multi-step form end-to-end tests pass
