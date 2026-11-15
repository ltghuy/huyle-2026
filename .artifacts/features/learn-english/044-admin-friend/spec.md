---
id: "044"
feature: admin-friend
type: brownfield
scope: medium
status: to-review
branch: main
created: 2026-11-15
---

# Feature: Kết bạn với quản trị viên

## Overview

Learners have no direct way to reach the owner. Friends (feature 031) already work across the app, and a friend request already reaches its receiver as a notification in the bell. The bell's "Hệ thống" tab (feature 034) lists the app's announcements. This feature adds an announcement there that lets a learner send the admin a friend request in one tap; the admin sees it in their own bell like any other request.

## Goals

- [ ] A signed-in learner can ask to be the admin's friend from the bell, without knowing who the admin is
- [ ] The admin is told through the existing friend request notification, with no new notification kind

## Out of Scope

| Feature | Reason |
|---------|--------|
| Messages or chat with the admin | Not asked; friends only |
| Choosing between several admins | One owner today; the first admin (oldest account) is the one shown |
| A server-side announcement store | Announcements still ship with the app (feature 034) |

## User Stories

### P1: Ask the admin to be my friend

- As a signed-in learner, I want a "Kết bạn với quản trị viên" item in "Hệ thống" so that I can connect with the person behind the app
- **Why P1:** the owner's request (2026-11-15)
- **Independent Test:** as a learner, open the bell, "Hệ thống", press "Kết bạn"; as the admin, see "{tên} muốn kết bạn với bạn" under "Cá nhân"

**Acceptance Criteria:**

- [x] AC-001: WHEN a signed-in learner who is not an admin opens "Hệ thống" THEN system SHALL show an announcement "Kết bạn với quản trị viên" with the admin's picture and name and the friend button of feature 031 ("Kết bạn", then "Đã gửi lời mời", or "Bạn bè" once friends); it counts as unread once, like other announcements
- [x] AC-002: WHEN the learner presses "Kết bạn" THEN system SHALL send the admin a friend request (feature 031, AC-003), which reaches the admin as "{tên} muốn kết bạn với bạn" in their bell; if the admin had already asked the learner, they SHALL become friends at once (031 AC-008)
- [x] AC-003: WHEN the signed-in learner is an admin THEN system SHALL not show the announcement nor count it as unread, and `GET /api/social/admin` SHALL return no admin
- [x] AC-004: WHEN `GET /api/social/admin` is called THEN system SHALL answer for signed-in learners only, with the first admin's id, name and picture (oldest account), in one D1 call
- [x] AC-005: WHEN the admin can't be loaded THEN system SHALL say "Chưa tải được thông tin quản trị viên." in place of the button, keeping the rest of the bell working; WHEN no admin exists THEN the announcement SHALL show no button

## Edge Cases

- WHEN the learner and the admin are already friends THEN the announcement SHALL show "Bạn bè" instead of a button
- WHEN the request was declined less than 7 days ago THEN it SHALL keep showing "Đã gửi lời mời", as feature 031 does

## Success Criteria

- [ ] From a learner's bell, one tap puts a request in the admin's "Cá nhân" tab

## Verification

- AC-001, AC-002, AC-003 (bell side), AC-005, edge "Bạn bè": `src/components/social/notification-bell.test.tsx` (learner sees the item with the admin's name, "Kết bạn" sends the request to the admin's id and turns into "Đã gửi lời mời"; friends see "Bạn bè"; an admin sees one unread announcement, no admin item and no admin request; load failure message). `src/lib/announcements.test.ts` for the list and read marks.
- AC-003 (server), AC-004: `src/server/social/admin-contact.service.test.ts` (oldest admin; none for an admin or with no admin) and `src/app/api/social/routes.test.ts` (401 for guests, session id only, no-store, 503).
- AC-002 relies on feature 031's `sendRequest`, unchanged: the request creates the admin's `friend_request` notification.
- Not checked in the browser: the owner's local account is an admin, for whom the item is hidden by design.

## Open Questions

None.
