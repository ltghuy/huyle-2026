---
id: "013"
feature: points-extra-lessons-streak-board
type: brownfield
scope: large
status: done
branch: main
created: 2026-10-30
---

# Feature: Spend points on extra lessons, rank the board by streak

## Overview

Points today are a score with nothing to do: each finished daily lesson adds 10, and the weekly board ranks learners by them. A learner who finishes early and wants to keep going gets only "Hẹn gặp lại bạn ngày mai" and free practice. The owner wants points to be worth something. The daily lesson now pays 20 points, and learners can spend points on extra lessons the same day. The first extra lesson costs 10 points and each one after it costs 30% more, until the price goes back to 10 the next day. Since points are now spent, they no longer say how regular a learner is, so the board ranks learners by their current streak instead.

## Goals

- [x] A learner who finishes the daily lesson can keep learning new words the same day by spending points, at a price that rises with each extra lesson and resets every day
- [x] The leaderboard rewards coming back every day: its order follows current streaks, and spending points never moves anyone on it

## Out of Scope

| Feature | Reason |
|---------|--------|
| Points from extra lessons, review or the exercise library | Owner decision: only the daily lesson earns points, so the balance can't grow by itself |
| Paying for review or the exercise library | Both stay free; only extra lessons cost points |
| Other things to buy with points (streak freezes, hints, themes) | Not asked for; a later feature can add them |
| Refunds or undoing a purchase | A started extra lesson is paid for; keeps the rules simple |
| A weekly board or weekly reset | Replaced by one board ranked by current streak (owner decision) |
| Proof that a reported streak is real | Same as 007: no accounts, progress lives in the browser. The server only refuses streaks that can't have been earned |

## User Stories

### P1: Earn 20 points and spend them on an extra lesson

- As a learner who finished today's lesson, I want to spend my points on another lesson so that I can learn more new words today instead of waiting for tomorrow
- **Why P1:** The point of the feature: points get a use
- **Independent Test:** A learner with 25 points finishes today's lesson and has 45. They start an extra lesson for 10 points (35 left) and finish it. The next one costs 13 (22 left), then 17 (5 left). The one after that costs 22 and can't be bought. The next day the daily lesson adds 20 (25), and the first extra lesson costs 10 again

**Acceptance Criteria:**

- [x] AC-001: WHEN a learner completes every part of today's lesson THEN system SHALL award 20 attendance points once for that day, plus the streak bonuses as today (20 at 7 days, 30 at 30, 100 at 100)
- [x] AC-002: WHEN a learner views their points on the home page or profile THEN system SHALL show the points they have now (everything earned minus everything spent). The profile SHALL also show the total ever earned
- [x] AC-003: WHEN today's lesson is finished THEN system SHALL offer "Học thêm một bài" on the home page with today's price for the next extra lesson and the learner's points
- [x] AC-004: WHEN the learner buys an extra lesson THEN system SHALL ask them to confirm the price, take the points, and start a lesson built the same way as the daily lesson: due reviews, the next new words, a grammar point when one is scheduled, sentences and writing
- [x] AC-005: WHEN the learner has bought extra lessons today THEN system SHALL price the next one at 10 points for the first, then 30% more each time, rounded to whole points (10, 13, 17, 22, 29, 37, ...)
- [x] AC-006: WHEN the learner's local date changes THEN system SHALL price the first extra lesson of the new day at 10 points again
- [x] AC-007: WHEN the learner has fewer points than the next extra lesson costs THEN system SHALL show the button disabled with how many points they need and how many they have, and SHALL take nothing
- [x] AC-008: WHEN the learner finishes an extra lesson THEN system SHALL record the answers and review schedule as in the daily lesson, award no points, leave the streak as it is, and not show the leaderboard
- [x] AC-009: WHEN the learner leaves an extra lesson before the end THEN system SHALL let them carry on with it from the home page that same day without paying again

### P1: The leaderboard ranks by current streak

- As a learner on the board, I want my place to follow how many days in a row I have learned so that showing up every day is what counts
- **Why P1:** Spending points would otherwise push learners down a points board; the owner asked for the change together with spending
- **Independent Test:** Three learners on the board: A on a 12-day streak, B on 5, C on 5 with more points ever earned than B. Order: A, C, B. B finishes today's lesson (6 days) and the dialog shows B sliding from 3rd to 2nd. A misses a whole day and drops off the board until their next lesson

**Acceptance Criteria:**

- [x] AC-010: WHEN a learner on the board finishes today's daily lesson THEN system SHALL send their current streak and their total points ever earned, and show their place among all learners on the board, the number of learners on it, and up to 3 learners above and 3 below them with names and streaks
- [x] AC-011: WHEN two learners have the same streak THEN system SHALL place the one with more points ever earned higher, and then the one who reached that streak first
- [x] AC-012: WHEN the learner's place is higher than before this lesson THEN system SHALL show their row moving up past the learners they overtook, as in 007 (the animation and reduced-motion rules stay)
- [x] AC-013: WHEN a learner on the board has not finished a daily lesson today or yesterday THEN system SHALL leave them off the board until their next daily lesson, because their streak is broken
- [x] AC-014: WHEN the learner spends points or finishes an extra lesson THEN system SHALL not change their place on the board
- [x] AC-015: WHEN the board, the join question or Settings describe the board THEN system SHALL say it ranks by days in a row, not weekly points, and SHALL no longer mention a Monday reset
- [x] AC-016: WHEN a request reports a streak that can't have been earned (more than one day longer than the entry's last report the day before, or longer than the days since the app opened) THEN system SHALL refuse it

### P2: Points and purchases survive sync and backups

- As a learner with two devices, I want my points and today's purchases to be the same everywhere so that I can't lose points or pay twice
- **Why P2:** Sync and backups already exist (001); without this the balance would differ between devices

**Acceptance Criteria:**

- [x] AC-017: WHEN progress moves to another device by backup file or sync THEN system SHALL carry every purchase and any unfinished extra lesson, so the balance and today's next price are the same on both
- [x] AC-018: WHEN two linked devices both bought extra lessons since they last synced THEN system SHALL keep every purchase, and the price of the next one SHALL count all of them

## Edge Cases

- WHEN two devices spent the same points offline and then sync THEN system SHALL keep both purchases and show a balance of 0 or below as "0 điểm", with no extra lesson for sale until the learner earns enough again
- WHEN a learner has an unfinished extra lesson at midnight THEN system SHALL drop it at the date change without refunding it, and today's daily lesson comes first as usual
- WHEN there are no new words left at the learner's level THEN system SHALL not sell an extra lesson and SHALL say there is nothing new to learn right now
- WHEN the learner has the app open in two tabs and buys an extra lesson in both THEN system SHALL charge once and open the same lesson
- WHEN the board can't be reached after the daily lesson THEN system SHALL finish the lesson and keep the points, as in 007 AC-006
- WHEN a learner's board entry was last updated under the weekly ranking THEN system SHALL leave it off the streak board until their next daily lesson sends a streak
- WHEN past days earned 10 points under the old rule THEN system SHALL keep them as they are; only days from this feature's release on earn 20

## Success Criteria

- [x] A learner can go from finishing the daily lesson to starting a paid extra lesson in two taps (button, confirm)
- [x] Zero cases in tests where an extra lesson awards points, changes the streak, or is charged twice
- [x] The board order in tests matches current streak, then total points earned, then who reached the streak first, in every case tested

## Open Questions

- None. The owner answered the three gray areas on 2026-10-30 (see decisions.md); the tentative choices there can change during design.

## Notes

- Owner request (2026-10-30): "When completed a daily exercise, the learner will be added more 20 points instead of 10. After that they could use this point to continue learning (begin with 10 point, it will increase 30% in the next exercises, reset in the next day, it begins with 10 points again). Align the rank will be order by streak long instead learner's points."
- Changes feature 001: AC-015 and the attendance note (20 points a day instead of 10), and reverses its out-of-scope line "Points unlocking content: points are a motivation signal, not a gate" for extra lessons only.
- Changes feature 007: the board is no longer weekly or ranked by points. AC-001, AC-002, AC-005 and AC-015 there are replaced by AC-010 to AC-016 here, and the board copy changes. Joining, leaving, names, secrets and rate limits stay as they are.
- Learners keep the points they already have, so a long-time learner can afford several extra lessons right away.

## Evidence

- AC-001: `src/learning/attendance.test.ts` "gives 20 points a day"; `src/lib/session/today.test.ts`; e2e `first-visit.spec.ts` and `extra-lesson.spec.ts` see "+20 điểm chuyên cần"
- AC-002: `src/components/profile/profile.test.tsx` (110 earned, 97 now); e2e `extra-lesson.spec.ts` (10 left after one purchase)
- AC-003, AC-004: `src/components/lesson/extra-lesson-card.test.tsx` (price, balance, confirm, navigate); `src/lib/session/extra.test.ts` (next new words, not the daily lesson's); e2e `extra-lesson.spec.ts`
- AC-005, AC-006: `src/learning/points.test.ts` (10, 13, 17, 22, 29, 37, 48; today only); `extra.test.ts` "start at 10 again the next day"
- AC-007: `extra.test.ts` "refuse a purchase without enough points"; `extra-lesson-card.test.tsx` disabled 13-point button with points needed
- AC-008: `extra.test.ts` "award no points and leave the streak alone"; e2e: no points line and no board after the extra lesson
- AC-009: `extra.test.ts` "can be resumed without paying again"; `src/storage/repositories.test.ts` extra lesson position saved with the answer
- AC-010 to AC-013: `src/server/leaderboard/leaderboard.service.test.ts` against SQLite with migrations 0002 and 0003 (order and rows, ties, broken streaks and old weekly rows hidden); `src/learning/leaderboard.test.ts` (numbers, slide); `src/components/leaderboard/leaderboard.test.tsx` (body sent, rows in days); e2e `first-visit.spec.ts` (board row "1 ngày")
- AC-014: only the daily lesson's finish screen submits (`lesson-player.tsx`); the extra lesson player has no board (e2e)
- AC-015: `leaderboard.test.tsx` dialog, consent and Settings names; no weekly wording left in `src/components/leaderboard`
- AC-016: service tests "refuses a streak that grew faster…" and "allows the days a learner studied without reporting"; `src/app/api/leaderboard/route.test.ts` (epoch bound, points bound, dates, 422 message)
- AC-017: `src/learning/snapshot.test.ts` (v2 file upgrades with none; old prices kept without plans; balance in summary); `src/storage/db.test.ts` (version 1 database upgrades and keeps data)
- AC-018: `src/learning/merge.test.ts` (both devices' purchases kept; trimmed plan never wins)
- Edge cases: two tabs (`src/storage/extra-lessons.test.ts`, `extra.test.ts`), midnight drop and nothing new (`extra.test.ts`), balance below 0 (`points.test.ts`, shown as 0 by the home and profile summaries)
- Gates (2026-10-30): lint, typecheck, unit tests, build (`/extra-lesson` static), e2e 16 specs. The e2e needs more A1 words than one daily lesson takes: 6 are in `scripts/fixtures/content/{word,sentence}/A1-extra-lesson.json` (moved out of `A1.json` in quick task 027, where they had broken script tests)

## Baseline

### Current Behavior

- Finishing every part of today's lesson awards 10 points once per local date, plus 20, 30 or 100 when the streak reaches 7, 30 or 100 days, and adds one day to the streak
- The home page shows the current streak and total points; the profile shows total points, current and longest streak and a 12-week calendar
- After the daily lesson the home card says "Bạn đã học xong hôm nay · Hẹn gặp lại bạn ngày mai" with links to free review and the exercise library. There is one lesson per day
- Learners who joined the board see, after each daily lesson, their place this week ranked by points earned since Monday, with up to 3 rows above and below and a sliding animation when they climb. Ties go to whoever reached the points first, and the board resets every Monday
- The server refuses more than 300 points in a week

### Gaps / Limitations

- Points can't be used for anything, so after the daily lesson there is no reason to collect them and no way to learn more new words that day
- A weekly points board can't work once points are spent: spending would push a learner down
