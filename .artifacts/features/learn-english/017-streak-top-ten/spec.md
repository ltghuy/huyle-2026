---
id: 017
feature: streak-top-ten
type: brownfield
scope: medium
status: to-review
branch: main
created: 2026-11-02
---

# Feature: Top 10 streaks on Hồ sơ

## Overview

The streak leaderboard (features 007 and 013) only shows up after the daily lesson, and only the learners just above and below you. Learners can't see who leads the board, and learners who haven't joined it never see it at all. Hồ sơ already shows a 12-week attendance calendar. A top 10 next to it gives learners a goal they can see whenever they check their progress, and invites the others to join.

## Goals

- [ ] Every learner who opens Hồ sơ sees the 10 longest live streaks on the board, next to the attendance calendar
- [ ] A learner on the board sees their own place, even when it's outside the top 10
- [ ] A learner not on the board can reach the join switch in Cài đặt in one tap

## Out of Scope

| Feature | Reason |
|---------|--------|
| Ranking by the best streak over the last 12 weeks | The board stores only each learner's current streak; the owner chose the current-streak ranking (2026-11-02) |
| Joining the board from Hồ sơ | Joining needs the name and consent step that lives in Cài đặt |
| Live updates while the page is open | The board changes at most once a day per learner |

## User Stories

### P1: See the leaders

- As a learner, I want to see the 10 longest streaks next to my calendar so that I know what it takes to reach the top
- **Why P1:** It's the feature
- **Independent Test:** With 12 learners on the board, open Hồ sơ: a "Top 10 chuỗi ngày học" panel to the right of "Lịch học 12 tuần gần đây" (below it on phones) lists 10 names with their streak in days, longest first

**Acceptance Criteria:**

- [x] AC-001: WHEN a learner opens Hồ sơ THEN system SHALL show, next to the 12-week calendar, up to 10 learners from the board with their place, name and streak in days, ordered as the board orders them (longer streak, then more points ever earned, then who reached that streak first)
- [x] AC-002: WHEN a learner's streak is broken (no daily lesson today or yesterday) THEN system SHALL leave them out of the top 10 and the count, as the board does (013 AC-013)
- [x] AC-003: WHEN the panel shows the top 10 THEN system SHALL say how many learners are on the board

### P1: My place

- As a learner on the board, I want to see my own place so that I know how far I am from the top 10
- **Why P1:** The list alone means little to someone in 23rd place
- **Independent Test:** On the board in 12th place, open Hồ sơ: below the 10 rows, a separate row shows "12", your name with "(bạn)" and your streak

**Acceptance Criteria:**

- [x] AC-004: WHEN the learner is on the board and in the top 10 THEN system SHALL mark their row with "(bạn)" and highlight it
- [x] AC-005: WHEN the learner is on the board but outside the top 10 THEN system SHALL show their place, name and streak in a highlighted row below the top 10
- [x] AC-006: WHEN the learner has joined but their streak is broken THEN system SHALL say they're off the board until their next daily lesson

### P2: Invite to join

- As a learner not on the board, I want to know how to join so that my streak counts
- **Why P2:** Grows the board, but the list works without it

**Acceptance Criteria:**

- [x] AC-007: WHEN the learner has not joined the board THEN system SHALL show the top 10 and a link to the board setting in Cài đặt

## Edge Cases

- WHEN nobody is on the board THEN system SHALL say the board is empty and still offer the link (or the "next daily lesson" note) as above
- WHEN the board can't be reached (offline, server error) THEN system SHALL show a short Vietnamese error with a "Thử lại" button, and the rest of Hồ sơ SHALL keep working
- WHEN the learner's saved board entry no longer exists on the server (removed after 90 days unused) THEN system SHALL treat them like a joined learner with a broken streak
- WHEN two learners have the same name THEN system SHALL show both rows; places stay distinct

## Success Criteria

- [ ] The panel adds one request per Hồ sơ visit, answered with one database batch
- [ ] No board secret or entry id appears in a URL

## Verification

- AC-001 to AC-003: `src/server/leaderboard/leaderboard.service.test.ts` "topEntries (017)" against SQLite (order, tie by points, broken streak left out, count); `src/components/leaderboard/leaderboard.test.tsx` (rows and count line)
- AC-004 to AC-006: service tests (place in and out of the top 10, none for a broken or unknown entry); component tests ("(bạn)" row, "Vị trí của bạn" row, broken-streak note)
- AC-007: component test (link to `/settings#bang-xep-hang`, no id header sent)
- Edge cases: empty board and offline retry in component tests; GET route tests for 422 on a bad date or id and 503 on a database failure
- In the browser (dev server, empty local board): the panel shows below the calendar at phone width and to its right at 1920 px, with the empty-board and join callouts. A full list was not seen in the browser (the local board is empty)
- Empty, not-joined and broken-streak states are emoji callouts (🏆, 🙌, 🔥); the broken-streak one links to Hôm nay ("Học bài hôm nay"). The top 3 places show 🥇🥈🥉, with the number kept for screen readers
- Gates: `pnpm typecheck`, `pnpm lint`, `pnpm test` (885 passed), `pnpm build` (passes)

## Open Questions

- None

## Notes

- Decided with the owner on 2026-11-02: rank by current streak (same as the board), show the top 10 to everyone, and add the join link and own place as above.
- The panel reads the board; it never writes to it. Only the daily lesson's finish screen reports a streak (013 AC-014).

## Baseline

### Current Behavior

- The board shows only after the daily lesson: the learner's place, the total, and up to 3 learners above and below.
- Learners who haven't joined never see the board.
- Hồ sơ shows points, streaks and a 12-week attendance calendar, with nothing about other learners.

### Gaps / Limitations

- No way to see who leads, or to see the board between lessons.
