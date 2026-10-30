---
slug: tour-update
completed: 2026-10-30
---

# Summary: Bring the first-visit tour up to date

## What Changed

The tour has 10 steps instead of 8. A new second step, "Chuỗi ngày và điểm", points at the streak and points summary on the home page and explains that the board ranks by days in a row and that points buy extra lessons after the daily one (10 points, then 30% more each time that day). A new "Động từ bất quy tắc" step points at its menu item. Several texts are updated: the daily lesson pays 20 points, vocabulary has Chuyên ngành sets, the exercise library has dictation and find the error, the profile shows points now and ever earned, and Settings has sync and the leaderboard. A unit test now fails when a menu item has no tour step, which is how irregular verbs was left out. 001 AC-039 lists the new areas.

## Files Modified

| File | Change |
|------|--------|
| `src/components/tour/tour-steps.ts` | 10 steps, new texts |
| `src/components/tour/tour-steps.test.ts` | every menu item and the streak summary has a step, no duplicates |
| `e2e/specs/first-visit.spec.ts` | counter "1/10", second step is the streak summary |
| `e2e/specs/tour.mobile.spec.ts` | one more step before grammar |
| `.artifacts/features/learn-english/001-learn-english-app/spec.md` | AC-039 areas |
| `scripts/fixtures/content/{word,sentence}/A1-extra-lesson.json` | moved here from `A1.json` (fix to 013, below) |

## Patterns Discovered

The script tests (`publish-content.test.ts`, `review.test.ts`) read only `fixtures/content/{kind}/A1.json` and pin exact counts. Fixture content that only the e2e seed needs goes in another file of the same folder (like `A1-verbs.json`), which the seed publishes and those tests ignore.

## Follow-Up

Fixed a regression from feature 013: its 6 extra fixture words had gone into `A1.json`, which broke 6 script tests that I hadn't rerun after adding them. They now live in `A1-extra-lesson.json`. All 788 unit tests and 16 e2e specs pass.
