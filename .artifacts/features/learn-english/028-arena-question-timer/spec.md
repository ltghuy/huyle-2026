---
id: 028
feature: arena-question-timer
type: brownfield
scope: medium
status: done
branch: main
created: 2026-11-06
---

# Feature: Host sets the time per question

## Overview

Every Arena question has a fixed time that depends on its type: 15 seconds for "Nghe" and "Nhớ từ", 30 seconds for "Viết câu". Hosts can't make a match faster for strong friends or slower for beginners. This feature lets the host pick the time each question gets when they create a room: 15, 25, 30 or 45 seconds, with 15 seconds chosen by default. The same time applies to every question type in that room.

## Goals

- [x] A host can create a room with any of the four question times in one tap, and every question in its matches runs for exactly that time
- [x] Both players (and spectators) see the room's question time before the match starts

## Out of Scope

| Feature | Reason |
|---------|--------|
| A different time per question type in one room | One time per room was asked for |
| Times other than 15, 25, 30 and 45 seconds | The owner's list |
| Showing the question time in match history | Past matches did not record it; history keeps showing mode, level and rounds |
| Remembering the host's last choice | Not asked for; every new room starts at 15 seconds |

## User Stories

### P1: Pick the question time when creating a room

- As a host, I want to choose how long each question lasts so that the match suits the people playing
- **Why P1:** It is the feature
- **Independent Test:** Create a room with 45 seconds, start a match, see a question's timer start at 45

**Acceptance Criteria:**

- [x] AC-001: WHEN the host opens the create-room form THEN system SHALL show a "Thời gian mỗi câu" choice with 15, 25, 30 and 45 seconds, 15 seconds selected
- [x] AC-009: WHEN the settings form is shown THEN "Số hiệp" SHALL be a radio choice (1 hiệp, 3 hiệp) on the same row as "Thời gian mỗi câu", and the two SHALL stack when the screen is too narrow for one row
- [x] AC-002: WHEN the host creates a room THEN system SHALL keep the chosen time as part of the room's settings
- [x] AC-003: WHEN a question opens (including a sudden-death question, and a question restarted after a player reconnects) THEN system SHALL give it the room's chosen time, whatever its type
- [x] AC-004: WHEN a question is on screen THEN its timer SHALL count down from the room's chosen time
- [x] AC-005: WHEN the mode cards are shown THEN they SHALL no longer state a fixed number of seconds per type

### P2: See and change the time before a match

- As a player or spectator, I want to see the room's question time so that I know what I'm agreeing to
- **Why P2:** Players press Ready for settings they can see

**Acceptance Criteria:**

- [x] AC-006: WHEN anyone is in the room before or between matches THEN the room's settings line SHALL include the question time (e.g. "Hỗn hợp · A2 · 3 hiệp · 15 giây/câu")
- [x] AC-007: WHEN the host edits the room's settings before a match THEN system SHALL let them change the question time like the other settings, and the other player SHALL see the "settings changed" notice
- [x] AC-008: WHEN the game guide describes the question types THEN it SHALL say the host picks the time per question instead of fixed times

## Edge Cases

- WHEN a create or settings request has no question time (an older page still open) THEN system SHALL use 15 seconds
- WHEN a create or settings request has a time outside the four options THEN system SHALL reject it like any invalid setting
- WHEN a room created before this change is still open THEN its questions SHALL use 15 seconds
- WHEN a past match is shown in history THEN its settings line SHALL show mode, level and rounds only

## Success Criteria

- [x] Unit tests cover the four times being accepted, other values rejected, a missing value defaulting to 15, and each question's deadline following the room's time
- [x] Lint, typecheck, unit tests and the Arena e2e tests pass

## Open Questions

- None

## Notes

- With 15 seconds as the default, "Viết câu" questions are shorter than the 30 seconds they had before unless the host picks a longer time. This is the owner's choice.

## Baseline

### Current Behavior

- Question time is fixed by type: 15 s listen, 15 s recall, 30 s write. The mode cards show these times, and so does the game guide.
- The settings form has mode, level and rounds.

### Gaps / Limitations

- Hosts can't adjust the pace of a match.
