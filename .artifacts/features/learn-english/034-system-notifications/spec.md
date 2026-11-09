---
id: 034
feature: system-notifications
type: brownfield
scope: medium
status: done
branch: main
created: 2026-11-09
---

# Feature: "Cá nhân" and "Hệ thống" tabs in the notification bell

## Overview

The bell in the page header (feature 031) lists only personal notifications: friend requests and accepted requests. The owner has no way to tell every learner about something new in the app, such as AI grading for "Dịch câu" (feature 033), which learners only find if they open Cài đặt. The owner asked on 2026-11-09 to split the bell into two tabs, "Cá nhân" and "Hệ thống", and to use "Hệ thống" to introduce the AI feature to all learners.

## Goals

- [x] Every signed-in learner sees the AI grading announcement in the bell, with an unread mark, the next time they open the app
- [x] Personal notifications behave as before, now under "Cá nhân"

## Out of Scope

| Feature | Reason |
|---------|--------|
| Writing or scheduling announcements from an admin screen | Announcements ship with a release; one announcement doesn't need a tool |
| Announcements for guests | The bell is for signed-in learners only (031 AC-030), and the exercise library and daily lesson need sign-in |
| Remembering read announcements across devices | Kept per device; a learner on two devices reads it twice, which is harmless |
| Push or email notifications | The bell is the only channel |

## User Stories

### P1: Two tabs in the bell

- As a learner, I want my friend notifications and the app's news apart so that I can find each one
- **Why P1:** The System tab needs a place to live
- **Independent Test:** Open the bell with a friend request waiting; see it under "Cá nhân", switch to "Hệ thống" and see the AI announcement

**Acceptance Criteria:**

- [x] AC-001: WHEN a signed-in learner opens the bell THEN system SHALL show two tabs, "Cá nhân" and "Hệ thống", each with its number of unread items when there are any
- [x] AC-002: WHEN the "Cá nhân" tab shows THEN system SHALL list friend notifications exactly as before (031 AC-024 to AC-029), including "Chưa có thông báo nào." when there are none
- [x] AC-003: WHEN the bell opens THEN system SHALL show "Cá nhân", unless it has nothing unread and "Hệ thống" does, then "Hệ thống"
- [x] AC-004: WHEN the bell's number shows THEN system SHALL count unread personal notifications plus unread system announcements
- [x] AC-005: WHEN a guest uses the app THEN system SHALL still show no bell

### P1: The AI grading announcement

- As a learner, I want to hear about AI grading so that I can turn it on if I want it
- **Why P1:** It is the reason for the System tab
- **Independent Test:** Sign in on a fresh device, see the bell's number, open "Hệ thống", read the announcement, follow its link to Cài đặt, reopen the bell and see no number

**Acceptance Criteria:**

- [x] AC-006: WHEN the "Hệ thống" tab shows THEN system SHALL list the app's announcements, newest first, each with a title, a short text and how long ago it was published, unread ones marked
- [x] AC-007: WHEN a learner reads the AI grading announcement THEN system SHALL explain in Vietnamese that "Dịch câu" can be graded by AI with their own free Google AI Studio key, that the key stays on their device, and link to the "Chấm điểm bằng AI" section of Cài đặt
- [x] AC-008: WHEN the learner already has an AI key THEN system SHALL say AI grading is on instead of offering the link to add one
- [x] AC-009: WHEN the learner opens "Hệ thống" THEN system SHALL count its announcements as read on this device, and the bell's number SHALL drop by them
- [x] AC-010: WHEN a learner signs out or deletes their account THEN system SHALL forget which announcements were read on this device, so the next learner sees them as new

## Edge Cases

- WHEN the friend notifications fail to load THEN system SHALL show the existing error and retry under "Cá nhân" and still show "Hệ thống", which needs no network
- WHEN the browser blocks storage THEN system SHALL treat announcements as read once opened, for that visit only
- WHEN a learner follows the announcement's link THEN system SHALL close the bell and open Cài đặt at the "Chấm điểm bằng AI" section

## Success Criteria

- [x] A signed-in learner on a new device sees a bell number of at least 1 and the AI announcement under "Hệ thống", and the number goes once they open that tab
- [x] Bell tests, lint, typecheck and build pass

## Open Questions

- None. Choices taken without asking (announcements in the code, read state per device, the default-tab rule) are listed in Notes.

## Notes

- Verified 2026-11-09: bell tests (the feature 031 ones unchanged, plus 6 for the tabs), announcements unit tests, device clear test, typecheck, lint. Checked in a built preview signed in as `e2e-thu`, at 1280 px light and 375 px dark: the bell opens on "Hệ thống" for a learner with no friend notifications, the announcement shows with its unread mark, and its link closes the bell and lands on `/settings#cham-bang-ai` with the section visible. AC-010 is covered by the `clearDevice` test.
- Audit 2026-11-09: all goals and success criteria met. Evidence: the preview check above (a fresh device signed in as `e2e-thu` had an unread bell and the announcement under "Hệ thống"), the bell test that the number returns to plain "Thông báo" once "Hệ thống" is opened, the unchanged feature 031 bell tests, and the full gates (1402 tests, lint, typecheck, build).
- Requested by the owner on 2026-11-09 with a screenshot of the bell.
- Choices made without asking the owner: announcements ship in the app's code with a release (no database); "read" is kept per device and cleared on sign-out; the bell opens on "Cá nhân" unless only "Hệ thống" has something unread.
- Related: feature 031 (the bell and friend notifications), feature 033 (AI grading).

## Baseline

### Current Behavior

- Signed-in learners see a bell with the number of unread friend notifications; guests see none
- Opening the bell loads the friend notifications, newest first, and counts them all as read; friend requests are answered in place

### Gaps / Limitations

- The app can't tell learners about new features; AI grading is only visible to learners who open Cài đặt
