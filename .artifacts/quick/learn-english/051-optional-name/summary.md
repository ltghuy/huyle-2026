---
slug: optional-name
completed: 2026-11-05
---

# Summary: Don't ask for a name on the first visit

## What Changed

The owner asked that learners not have to type a name the first time they open the app. The "Bạn tên là gì?" dialog is gone from both layouts. The name is now optional for everyone in Settings ("Tên gọi (không bắt buộc)"), where an empty field clears it. The welcome dialog no longer waits for a name and says "Chào mừng bạn" when none is stored. Every other place that shows a name already used `learnerName()` with a fallback to the Google name, then "bạn" or "Học viên", so nothing else changed. Spec 003 retires AC-001, AC-002, AC-005 and its first Goal and Success Criterion; feature 001 AC-038 and `.agents/knowledge.md` were updated to match.

## Files Modified

| File | Change |
|------|--------|
| src/components/name/name-prompt.tsx | Deleted |
| src/components/name/name-prompt.test.tsx → name-form.test.tsx | Kept only the NameSetting test, now with the optional label |
| src/app/(app)/layout.tsx, src/app/(focus)/layout.tsx | No longer mount the prompt |
| src/components/tour/app-tour.tsx | Welcome dialog shows without a name |
| src/components/settings/name-setting.tsx | Optional for guests too; toast fits guests and signed-in learners |
| src/components/account/learner-name.test.tsx | Guest test now clears the name instead of expecting the dialog |
| e2e/helpers.ts, e2e/specs/{first-visit,smoke,arena}.spec.ts | `enterName` removed; new test for no name dialog on /placement |

## Patterns Discovered

None.

## Follow-Up

- Two older e2e tests in `first-visit.spec.ts` ("first visit: placement, welcome and tour…" and "a lesson left halfway resumes…") were already failing before this change: since feature 022 a guest on `/` gets the sign-in gate, so `skipPlacement` never reaches `/placement`. They need a signed-in session or a new entry path.
