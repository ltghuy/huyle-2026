---
id: 032
feature: friends-page
type: brownfield
scope: medium
status: done
branch: main
created: 2026-11-09
---

# Feature: Friends page for phones

## Overview

On phones there is no sidebar, so feature 031 put the friends list on the Đấu trường hub (AC-017). Friends are not part of the Arena, and the list sits low on a long page, so learners have to scroll the Arena to see who is online. The owner wants friends reachable from the phone navigation like any other destination, with the Arena hub kept for matches.

## Goals

- [x] On a phone, a signed-in learner reaches their friends list in two taps from any app page (Thêm, then Bạn bè).
- [x] The Đấu trường hub no longer shows a friends section on any screen size.

## Out of Scope

| Feature | Reason |
|---------|--------|
| A "Bạn bè" tab in the bottom bar itself | The bar already holds its maximum of four destinations plus Thêm |
| A "Bạn bè" item in the desktop sidebar | The desktop sidebar already shows the list under the navigation (031 AC-010) |
| Searching for or adding friends from the new page | Friends still come from Arena matches (031) |
| An online count on the Thêm button | Not asked for; can follow later |

## User Stories

### P1: Friends from the phone navigation

- As a learner on a phone, I want a "Bạn bè" entry in the navigation so that I can see who is online without opening the Arena.
- **Why P1:** It is the request.
- **Independent Test:** On a phone-sized screen, open Thêm, tap Bạn bè, see the friends list.

**Acceptance Criteria:**

- [x] AC-001: WHEN a learner opens the Thêm sheet on a phone THEN system SHALL list a "Bạn bè" item with the users icon that opens the friends page
- [x] AC-002: WHEN a signed-in learner opens the friends page THEN system SHALL show the same friends list as the desktop sidebar: online first, online count, last active, remove a friend, loading, error and empty states
- [x] AC-003: WHEN a guest opens the friends page THEN system SHALL show a sign-in prompt in place of the list, and send no friends request to the server
- [x] AC-004: WHEN the learner is on the friends page THEN system SHALL mark the Bạn bè item as the current page in the Thêm sheet, and mark the Thêm button as active
- [x] AC-005: WHEN the friends page is fetched by a search engine THEN system SHALL mark it noindex and leave it out of the sitemap, like the other pages holding the learner's own data

### P1: Arena hub without friends

- As a learner, I want the Arena hub to be about matches only, now that friends have their own page.
- **Why P1:** Same list in two places on a phone is what the request removes.

**Acceptance Criteria:**

- [x] AC-006: WHEN anyone opens the Đấu trường hub on any screen size THEN system SHALL show no friends section

## Edge Cases

- WHEN a learner opens the friends page on a wide screen THEN system SHALL show the same list there too, alongside the sidebar's own section
- WHEN it is not yet known whether the learner is signed in THEN system SHALL show neither the list nor the sign-in prompt until it is known

## Success Criteria

- [x] A phone e2e test signs in, opens Thêm, taps Bạn bè and sees the friends region; the Arena hub shows no friends region.
- [x] typecheck, lint, unit tests and build pass.

## Open Questions

- None. Placement in the Thêm sheet (not the bar) and no desktop sidebar item were chosen as defaults; the owner can ask to change either.

## Notes

Design direction (ui-ux-pro-max): the page opens with the same small hero as the study pages (pill, title, one line, the cat), then one card holding the list, no wider than a readable column. Rows keep the status in words next to the coloured dot, so online is never shown by colour alone. On this page each row's menu button is at least 44 by 44 px for thumbs, with 8 px or more between tap targets; the sidebar keeps its compact rows. The Bạn bè item sits in the Thêm sheet above Nguồn dữ liệu.

Supersedes feature 031 AC-017 (friends on the Đấu trường page on phones). The desktop sidebar section (031 AC-010, AC-011) is unchanged.

## Baseline

### Current Behavior

- On phones, signed-in learners see a "Bạn bè" card on the Đấu trường hub, between joining by code and match history. Wide screens hide that card and show friends in the sidebar.
- The Thêm sheet lists the pages not in the bottom bar, plus Nguồn dữ liệu.

### Gaps / Limitations

- Friends are only reachable on a phone by opening the Arena and scrolling past the game modes.

## Audit

2026-11-09. Goal 1: the phone e2e test opens Thêm, taps Bạn bè and reaches the list in two taps from /arena; the item is in the sheet on every app page. Goal 2: the hub's friends card was deleted and the unit test shows no friends region and no pulse on the hub for a signed-in learner. Success criteria: `arena-friends.mobile.spec.ts` and the desktop friends spec pass; lint, typecheck, 1342 unit tests and the build pass, with `/friends` prerendered as a static page. A phone screenshot showed the hero, the list card and Thêm marked active.
