---
slug: email-status-shift
completed: 2026-10-21
---

# Summary: Stop the email check from moving the Next button

## What Changed

The email field's status paragraph rendered empty (0 px) until the check started, then grew to 22 px, pushing the Next button down. A press made right after typing landed its mousedown on the button and its mouseup on the element below, so no click fired and the step didn't change. The paragraph now keeps one line (`min-h-5`) and lays out as a flex row, so its content is exactly that line (an inline-flex span on the text baseline had added 2 px). Measured with a Playwright script: the button stays at the same position through the press, and Next advances on the first press.

## Files Modified

| File | Change |
|------|--------|
| src/practices/multi-step-form/fields.tsx | Status line reserves one line and is a flex row |

## Patterns Discovered

A status or hint line that appears next to a button should reserve its space; see knowledge.md.

## Follow-Up

None
