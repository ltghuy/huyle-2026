---
id: 007
feature: weekly-leaderboard
type: brownfield
scope: large
status: to-review
branch: feature/learn-english
created: 2026-10-28
---

# Feature: Weekly leaderboard after the daily lesson

> **Changed by feature 013 (2026-10-30):** the board is no longer weekly or ranked by points. One board ranks learners by current streak, then points ever earned, then who reached the streak first, and only learners whose last daily lesson was today or yesterday are on it. AC-001, AC-002, AC-005 and AC-015 below describe the weekly board and are replaced by 013 AC-010 to AC-016; the rest still holds.

## Overview

Learners earn attendance points for each finished daily lesson, but they only
ever see their own total. The owner wants a reason to come back that comes
from other learners: after the daily lesson, a dialog shows where the learner
stands this week among everyone else and, when they moved up, slides their
row from the old place to the new one, as Duolingo's leagues do.

The app has no accounts and its usage stats are anonymous by promise (001
AC-056, 003 AC-004), so the board is separate from stats and opt-in: a
learner appears on it only after saying yes, under the name they choose.

## Goals

- [ ] A learner who finishes the daily lesson sees their place this week among the other learners on the board, and how far they moved
- [ ] Nobody appears on the board without saying yes, and anyone can leave it at any time
- [ ] Anonymous usage stats stay anonymous: nothing in them changes

## Out of Scope

| Feature | Reason |
|---------|--------|
| Names or points in the anonymous stats | 001 AC-056 and 003 AC-004 promise stats without names |
| Leagues, divisions, promotion and relegation | One board for everyone per week first |
| Friends, following, messages, profiles of other learners | No accounts; the board shows names and points only |
| Proof that reported points are real | No accounts: points come from the learner's browser. Accepted by the owner (2026-10-28) |
| Owner approval of names | Owner chose an automatic basic filter (2026-10-28) |
| A leaderboard page in the navigation | The board shows after the daily lesson; a page can follow |

## User Stories

### P1: See my place after the daily lesson

- As a learner, I want to see where I stand this week after finishing my lesson so that I feel my effort against other learners
- **Why P1:** The point of the feature
- **Independent Test:** Two learners on the board, A with fewer points this week than B. A finishes today's lesson and passes B: the dialog shows A sliding from 2nd to 1st

**Acceptance Criteria:**

- [x] AC-001: WHEN a learner on the board finishes today's daily lesson and is awarded its points THEN system SHALL send their points for this week and show a dialog with their place this week, the number of learners on the board this week, and up to 3 learners above and 3 below them with names and points
- [x] AC-002: WHEN their place is higher than before this lesson's points THEN system SHALL show their row moving up from the old place to the new one, passing the learners they overtook, and say how many places they moved
- [x] AC-003: WHEN their place did not change THEN system SHALL show the board without movement and an encouraging line
- [x] AC-004: WHEN the learner's device asks for reduced motion THEN system SHALL show the final board without the sliding animation
- [x] AC-005: WHEN the week changes (Monday in the learner's time zone) THEN system SHALL rank by points earned from that Monday on, so everyone starts the week at 0
- [x] AC-006: WHEN the board can't be reached (offline, server error) THEN system SHALL finish the lesson as today and show that the ranking couldn't be loaded, without losing any points

### P1: Join only by choice, leave any time

- As a learner, I want to decide whether my name appears to others so that I stay in control of what is public
- **Why P1:** Names become visible to strangers; no consent, no feature

**Acceptance Criteria:**

- [x] AC-007: WHEN a learner who has never answered finishes a daily lesson THEN system SHALL ask once whether to show them on the weekly board, with their name prefilled and editable as a nickname, and buttons to join or decline
- [x] AC-008: WHEN the learner declines THEN system SHALL not ask again and SHALL send nothing to the board
- [x] AC-009: WHEN the learner opens Settings THEN system SHALL show whether they are on the board, let them join, leave or change the shown name
- [x] AC-010: WHEN the learner leaves the board THEN system SHALL delete their entry from the server, and other learners SHALL no longer see it
- [x] AC-011: WHEN the learner's progress moves to another device (sync or backup file) THEN system SHALL keep the same board entry and choice, so the two devices never appear as two learners

### P2: Names on the board are acceptable

- As the owner, I want offensive names kept off the board so that the board is safe to show to everyone
- **Why P2:** Basic protection; impersonation is not prevented

**Acceptance Criteria:**

- [x] AC-012: WHEN a learner joins or changes their shown name THEN system SHALL apply the name rules of feature 003 and reject names containing a word from a short list of slurs and profanity, with a Vietnamese message next to the field
- [x] AC-013: WHEN the server receives a name that breaks those rules THEN system SHALL refuse it, whatever the browser sent

### P2: The board can't be taken over

- As a learner, I want only my own devices to change my entry so that nobody else can rename or remove me
- **Why P2:** Without accounts, a secret kept on the device is the only proof

**Acceptance Criteria:**

- [x] AC-014: WHEN a request changes or deletes an entry without that entry's secret THEN system SHALL refuse it
- [x] AC-015: WHEN a request reports more points in a week than the app can award THEN system SHALL refuse it
- [x] AC-016: WHEN one network sends board requests far faster than learning allows THEN system SHALL slow it down with a Vietnamese message

## Edge Cases

- WHEN two learners have the same points THEN system SHALL place the one who reached them first higher
- WHEN the learner is the only one on the board this week THEN system SHALL show them 1st of 1 with an encouraging line
- WHEN the learner finishes today's lesson again (already awarded) THEN system SHALL not show the board again
- WHEN the learner has not answered the consent question and the board is unreachable THEN system SHALL still ask; joining saves the choice and the board shows on the next lesson
- WHEN a board entry has not been updated for 90 days THEN system SHALL delete it

## Success Criteria

- [ ] A learner who joins and finishes a lesson sees the board within 2 seconds on a normal connection
- [ ] No request to the board changes another learner's entry without its secret (tested)
- [ ] The anonymous stats tables and their report are unchanged (no new columns, same report output)

## Open Questions

None.

## Notes

- Owner decisions (2026-10-28): rank by weekly points (Monday to Sunday, like Duolingo leagues); opt-in asked once after a daily lesson; basic automatic name filter. Points are self-reported, so a determined learner can fake them; accepted.
- Reverses 001's out-of-scope "Leaderboards, rankings, social features (points + streak only)" for this one board.
- "Moved up" compares the learner's place before this lesson's points with the place after, against the board as it is now. That is what the learner just earned; other learners' changes since yesterday don't move them.

## Evidence

- AC-001, AC-002, AC-003, AC-006, AC-007, AC-008, AC-012 (browser): `src/components/leaderboard/leaderboard.test.tsx` "after the daily lesson"
- AC-002, AC-004: same file, "WeeklyBoard": the learner starts 2 places lower and slides up; reduced motion shows the final board
- AC-005: `src/learning/leaderboard.test.ts` "weeks"; `leaderboard.service.test.ts` "only ranks learners who posted this week"
- AC-001, AC-002, ties, alone, retention: `src/server/leaderboard/leaderboard.service.test.ts`, against real SQLite with the app's migrations (`src/test-utils/sqlite-d1.ts`): 7th to 5th with 3 rows above and below
- AC-009, AC-010: `leaderboard.test.tsx` "Settings": leave deletes then saves "declined"; a refused delete keeps the learner on; rename sends this week's points
- AC-011: `src/learning/snapshot.test.ts`, `src/learning/merge.test.ts` (backup keeps the entry; sync keeps the last choice)
- AC-012, AC-013: `leaderboard.test.ts` "checkBoardName"; `src/app/api/leaderboard/route.test.ts` refuses a blocked name
- AC-014: service tests (wrong secret changes nothing; delete refused) and route tests (403)
- AC-015, AC-016: route tests (points over 300, previous above current, 429 with the IP as the limiter key)
- End to end: `e2e/specs/first-visit.spec.ts` joins from the dialog after the first lesson and sees its row with 10 points, against the preview's local D1; reopening the finished lesson shows no board. All 10 specs pass
- Browser check on the dev server at 430px with 7 sample learners: consent dialog, the slide from 8th to 5th past 3 learners, the final board (2026-10-28)
- Success criteria: "within 2 seconds" is not measured in production yet (needs the remote migration and a deploy); the other two are covered above, and the stats tables, schema and report are untouched

## Baseline

### Current Behavior

- Finishing the daily lesson awards attendance points (10 a day, plus streak bonuses at 7, 30 and 100 days) and shows the points and the streak
- Points and streak live only in the learner's browser (and their backup or sync blob)
- Anonymous stats count devices per day with a hash that changes daily and never carry names

### Gaps / Limitations

- Learners can't see how they compare with anyone else
